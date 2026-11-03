-- Corregir equivocaciones del reparto:
--  · deshacer_entrega: una parada marcada «Entregado» o «No entregado» por error vuelve a
--    pendiente (o sale de la ruta y su albarán vuelve a «por repartir»).
--  · reactivar_albaranes: un albarán ya entregado o en una ruta vuelve a «por repartir»
--    (p. ej. al subir otra vez un albarán que se aplazó).
-- Solo la oficina; deshacer una entrega también lo puede hacer el repartidor de esa ruta.

-- La oficina (con la marca de la transacción) puede corregir una entrega ya registrada
create or replace function proteger_parada() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.estado = 'pendiente'
       or (old.cliente_id is not null and not exists (select 1 from clientes where id = old.cliente_id))
       or not exists (select 1 from rutas where id = old.ruta_id)
       or current_setting('app.borrado_oficina', true) = 'on' then
      return old;
    end if;
    raise exception 'Una entrega ya registrada no se puede borrar' using errcode = 'P0001';
  end if;
  if old.estado = 'pendiente' then return new; end if;
  if current_setting('app.borrado_oficina', true) = 'on' then return new; end if;
  -- Única excepción: borrar el pedido deja la parada sin enlace (las líneas entregadas quedan copiadas)
  if new.pedido_id is null and (to_jsonb(new) - 'pedido_id') = (to_jsonb(old) - 'pedido_id') then return new; end if;
  raise exception 'La entrega ya está registrada y no se puede modificar' using errcode = 'P0001';
end $$;

-- Estado de la ruta según sus paradas (tras deshacer o quitar alguna)
create or replace function recalcular_ruta(p_ruta uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  total integer;
  quedan integer;
begin
  select count(*), count(*) filter (where estado = 'pendiente') into total, quedan from paradas where ruta_id = p_ruta;
  if total = 0 then
    delete from rutas where id = p_ruta;
    return;
  end if;
  update rutas set
    estado = case when quedan = 0 then 'terminada'::estado_ruta
                  when quedan = total then 'planificada'::estado_ruta
                  else 'en_curso'::estado_ruta end,
    iniciada_at = case when quedan = total then null else iniciada_at end,
    terminada_at = case when quedan = 0 then coalesce(terminada_at, now()) else null end
  where id = p_ruta;
end $$;

-- Deshace una entrega. p_quitar = true: además la saca de la ruta (el albarán, a «por repartir»).
-- Devuelve las fotos/firma que había para borrarlas del almacén.
create or replace function deshacer_entrega(p_parada uuid, p_quitar boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p paradas%rowtype;
  archivos text[];
  dia date;
begin
  select * into p from paradas where id = p_parada;
  if not found then raise exception 'Esa parada ya no existe' using errcode = 'P0002'; end if;
  if not (es_admin() or conduce_ruta(p.ruta_id)) then
    raise exception 'Solo la oficina o el repartidor de la ruta pueden deshacerla' using errcode = '42501';
  end if;
  archivos := array(select x from unnest(array_append(p.fotos, p.firma_path)) x where x is not null);

  if p.estado <> 'pendiente' then
    -- Un «No entregado» cuyo albarán ya va en otra ruta no puede volver a esta
    if p.estado = 'fallida' and not p_quitar and (
         (p.albaran_id is not null and exists (select 1 from paradas o where o.albaran_id = p.albaran_id and o.id <> p.id and o.estado <> 'fallida'))
      or (p.pedido_id is not null and exists (select 1 from paradas o where o.pedido_id = p.pedido_id and o.id <> p.id and o.estado <> 'fallida'))) then
      select r.fecha into dia from paradas o join rutas r on r.id = o.ruta_id
        where (o.albaran_id = p.albaran_id or o.pedido_id = p.pedido_id) and o.id <> p.id and o.estado <> 'fallida' limit 1;
      raise exception 'Ese albarán ya está en otra ruta (la del %). Quítalo de allí primero.', to_char(dia, 'DD/MM') using errcode = 'P0001';
    end if;
    perform set_config('app.borrado_oficina', 'on', true);
    update paradas set
      estado = 'pendiente', entrega_id = null, realizada_at = null, registrada_at = null, registrada_por = null,
      firmante = null, firma_path = null, fotos = '{}', lineas = '[]', envases_entregados = 0, envases_recogidos = 0,
      cobrado = null, forma_cobro = null, motivo_fallo = null, observaciones = null, lat = null, lng = null, precision_m = null
    where id = p.id;
    perform set_config('app.borrado_oficina', 'off', true);
    if p.albaran_id is not null then
      update albaranes set estado = 'planificado' where id = p.albaran_id;
    end if;
    insert into eventos_reparto (ruta_id, parada_id, tipo, detalle)
      values (p.ruta_id, p.id, 'parada_deshecha', jsonb_build_object('antes', p.estado, 'realizada_at', p.realizada_at, 'quitar', p_quitar));
  end if;

  if p_quitar then
    delete from paradas where id = p.id; -- pendiente: el albarán vuelve a «por repartir» (trigger)
  end if;
  perform recalcular_ruta(p.ruta_id);
  return jsonb_build_object('archivos', to_jsonb(archivos));
end $$;

-- Vuelve a poner albaranes «por repartir» aunque ya estén entregados o en una ruta:
-- se quitan de sus rutas (con lo registrado) y las rutas que se queden vacías se borran.
create or replace function reactivar_albaranes(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  archivos text[];
  rutas_tocadas uuid[];
  r uuid;
  n integer;
begin
  if not es_admin() then raise exception 'Solo la oficina puede hacer esto' using errcode = '42501'; end if;
  select coalesce(array_agg(x), '{}') into archivos
    from paradas p, unnest(array_append(p.fotos, p.firma_path)) x
    where p.albaran_id = any(p_ids) and x is not null;
  select coalesce(array_agg(distinct ruta_id), '{}') into rutas_tocadas from paradas where albaran_id = any(p_ids);
  perform set_config('app.borrado_oficina', 'on', true);
  delete from paradas where albaran_id = any(p_ids);
  perform set_config('app.borrado_oficina', 'off', true);
  update albaranes set estado = 'pendiente' where id = any(p_ids);
  get diagnostics n = row_count;
  foreach r in array rutas_tocadas loop
    perform recalcular_ruta(r);
  end loop;
  return jsonb_build_object('reactivados', n, 'archivos', to_jsonb(archivos));
end $$;

revoke all on function recalcular_ruta(uuid) from public, anon, authenticated;
revoke all on function deshacer_entrega(uuid, boolean) from public, anon;
revoke all on function reactivar_albaranes(uuid[]) from public, anon;
grant execute on function deshacer_entrega(uuid, boolean) to authenticated;
grant execute on function reactivar_albaranes(uuid[]) to authenticated;

notify pgrst, 'reload schema';
