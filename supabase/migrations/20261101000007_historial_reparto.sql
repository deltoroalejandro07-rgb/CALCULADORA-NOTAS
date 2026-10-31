-- Historial de «Mi reparto»: ver las rutas de días pasados (solo lectura).
-- El conductor ve las suyas; la oficina (admin) ve todas.
-- Y dos funciones de la oficina para borrar pruebas (rutas con entregas y albaranes).

-- Días con rutas en los últimos 120 días, con un resumen
create or replace function mis_dias_reparto() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(d order by d ->> 'fecha' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'fecha', r.fecha,
      'rutas', count(distinct r.id),
      'paradas', count(p.id),
      'entregadas', count(p.id) filter (where p.estado = 'entregada'),
      'fallidas', count(p.id) filter (where p.estado = 'fallida')
    ) as d
    from rutas r
    left join paradas p on p.ruta_id = r.id
    where (r.conductor_id = auth.uid() or es_admin())
      and r.fecha between hoy_madrid() - 120 and hoy_madrid() + 7
    group by r.fecha
  ) t;
$$;

-- Las rutas de un día, con cada parada y lo que pasó
create or replace function reparto_del_dia(p_fecha date) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(ruta order by ruta ->> 'vehiculo_nombre', ruta ->> 'creado_at'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', r.id,
      'fecha', r.fecha,
      'estado', r.estado,
      'notas', r.notas,
      'creado_at', r.creado_at,
      'vehiculo_nombre', v.nombre,
      'vehiculo', case when v.id is not null then jsonb_build_object('nombre', v.nombre, 'matricula', v.matricula) end,
      'conductor', (select nombre from perfiles where id = r.conductor_id),
      'paradas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'orden', p.orden,
          'estado', p.estado,
          'realizada_at', p.realizada_at,
          'llegada_prevista', to_char(p.llegada_prevista, 'HH24:MI'),
          'albaran', al.numero,
          'motivo_fallo', p.motivo_fallo,
          'cobrado', p.cobrado,
          'forma_cobro', p.forma_cobro,
          'envases_recogidos', p.envases_recogidos,
          'observaciones', p.observaciones,
          'nombre', coalesce(c.nombre_negocio, d.nombre),
          'direccion', concat_ws(', ', coalesce(c.direccion, d.direccion), coalesce(c.localidad, d.localidad)),
          'lineas', case
            when jsonb_array_length(p.lineas) > 0 then p.lineas  -- lo que se entregó de verdad
            when al.id is not null then coalesce((
              select jsonb_agg(jsonb_build_object('descripcion', x ->> 'descripcion', 'cantidad', coalesce((x ->> 'cantidad')::numeric, 1)))
              from jsonb_array_elements(al.lineas) x), '[]'::jsonb)
            else '[]'::jsonb end
        ) order by p.orden)
        from paradas p
        left join clientes c on c.id = p.cliente_id
        left join destinos d on d.id = p.destino_id
        left join albaranes al on al.id = p.albaran_id
        where p.ruta_id = r.id), '[]'::jsonb)
    ) as ruta
    from rutas r
    left join vehiculos v on v.id = r.vehiculo_id
    where (r.conductor_id = auth.uid() or es_admin())
      and r.fecha = p_fecha
  ) t;
$$;

revoke all on function mis_dias_reparto() from public, anon;
revoke all on function reparto_del_dia(date) from public, anon;
grant execute on function mis_dias_reparto() to authenticated;
grant execute on function reparto_del_dia(date) to authenticated;

-- ---------- Borrar pruebas (solo la oficina) ----------
-- Las entregas registradas están protegidas contra borrados. Estas dos funciones (solo admin) las
-- pueden quitar activando un permiso que dura solo lo que dura su propia transacción.

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
  -- Única excepción: borrar el pedido deja la parada sin enlace (las líneas entregadas quedan copiadas)
  if new.pedido_id is null and (to_jsonb(new) - 'pedido_id') = (to_jsonb(old) - 'pedido_id') then return new; end if;
  raise exception 'La entrega ya está registrada y no se puede modificar' using errcode = 'P0001';
end $$;

create or replace function proteger_ruta() returns trigger
language plpgsql as $$
begin
  if current_setting('app.borrado_oficina', true) = 'on' then return old; end if;
  if exists (select 1 from paradas where ruta_id = old.id and estado <> 'pendiente') then
    raise exception 'La ruta tiene entregas registradas y no se puede borrar' using errcode = 'P0001';
  end if;
  return old;
end $$;

-- Borra una ruta aunque tenga entregas; sus albaranes vuelven a «por repartir».
-- Devuelve las fotos/firmas que hay que quitar del almacén.
create or replace function borrar_ruta_completa(p_ruta uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  archivos text[];
begin
  if not es_admin() then raise exception 'Solo la oficina puede borrar rutas' using errcode = '42501'; end if;
  perform set_config('app.borrado_oficina', 'on', true);
  select coalesce(array_agg(x), '{}') into archivos
    from paradas p, unnest(array_append(p.fotos, p.firma_path)) x
    where p.ruta_id = p_ruta and x is not null;
  update albaranes set estado = 'pendiente'
    where id in (select albaran_id from paradas where ruta_id = p_ruta and albaran_id is not null)
      and estado in ('planificado', 'entregado');
  delete from paradas where ruta_id = p_ruta;
  delete from rutas where id = p_ruta;
  perform set_config('app.borrado_oficina', 'off', true);
  return archivos;
end $$;

-- Empezar de cero: todos los albaranes, sus paradas y las rutas que se queden vacías
-- (y, si se pide, las direcciones guardadas). No toca zonas, vehículos, almacén ni el CRM.
create or replace function vaciar_albaranes(p_destinos boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  archivos text[];
  pdfs text[];
  n_albaranes integer;
  n_rutas integer;
begin
  if not es_admin() then raise exception 'Solo la oficina puede hacer esto' using errcode = '42501'; end if;
  perform set_config('app.borrado_oficina', 'on', true);
  select coalesce(array_agg(x), '{}') into archivos
    from paradas p, unnest(array_append(p.fotos, p.firma_path)) x
    where p.cliente_id is null and x is not null;
  select coalesce(array_agg(distinct archivo_path) filter (where archivo_path is not null), '{}'), count(*)
    into pdfs, n_albaranes from albaranes;
  delete from paradas where cliente_id is null;
  with borradas as (
    delete from rutas r where not exists (select 1 from paradas p where p.ruta_id = r.id) returning 1
  ) select count(*) into n_rutas from borradas;
  delete from albaranes where true;  -- (Supabase exige WHERE en los DELETE)
  if p_destinos then delete from destinos where true; end if;
  perform set_config('app.borrado_oficina', 'off', true);
  return jsonb_build_object('albaranes', n_albaranes, 'rutas', n_rutas, 'archivos', to_jsonb(archivos), 'pdfs', to_jsonb(pdfs));
end $$;

revoke all on function borrar_ruta_completa(uuid) from public, anon;
revoke all on function vaciar_albaranes(boolean) from public, anon;
grant execute on function borrar_ruta_completa(uuid) to authenticated;
grant execute on function vaciar_albaranes(boolean) to authenticated;

notify pgrst, 'reload schema';
