-- Borrar albaranes aunque tengan intentos de entrega anteriores (p. ej. un «No entregado»: el
-- albarán vuelve a «por repartir» pero el intento queda guardado y bloqueaba el borrado).
-- Solo la oficina. Quita también sus paradas y las rutas que se queden vacías.
create or replace function borrar_albaranes(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  archivos text[];
  pdfs text[];
  rutas_tocadas uuid[];
  n integer;
begin
  if not es_admin() then raise exception 'Solo la oficina puede borrar albaranes' using errcode = '42501'; end if;
  perform set_config('app.borrado_oficina', 'on', true);
  select coalesce(array_agg(x), '{}') into archivos
    from paradas p, unnest(array_append(p.fotos, p.firma_path)) x
    where p.albaran_id = any(p_ids) and x is not null;
  select coalesce(array_agg(distinct ruta_id), '{}') into rutas_tocadas from paradas where albaran_id = any(p_ids);
  select coalesce(array_agg(distinct archivo_path) filter (where archivo_path is not null), '{}') into pdfs from albaranes where id = any(p_ids);
  delete from paradas where albaran_id = any(p_ids);
  delete from albaranes where id = any(p_ids);
  get diagnostics n = row_count;
  delete from rutas r where r.id = any(rutas_tocadas) and not exists (select 1 from paradas p where p.ruta_id = r.id);
  perform set_config('app.borrado_oficina', 'off', true);
  -- PDF que ya no usa ningún otro albarán (un PDF puede traer varios)
  select coalesce(array_agg(x), '{}') into pdfs from unnest(pdfs) x where not exists (select 1 from albaranes a where a.archivo_path = x);
  return jsonb_build_object('borrados', n, 'archivos', to_jsonb(archivos), 'pdfs', to_jsonb(pdfs));
end $$;

revoke all on function borrar_albaranes(uuid[]) from public, anon;
grant execute on function borrar_albaranes(uuid[]) to authenticated;

notify pgrst, 'reload schema';
