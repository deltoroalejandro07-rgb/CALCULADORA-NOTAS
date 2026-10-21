-- =====================================================================
-- CRM HORECA · Row Level Security
-- Migración: supabase/migrations/0002_rls.sql
--   admin     → todo
--   comercial → sus clientes asignados y lo que cuelga de ellos;
--               catálogo, plantillas y ofertas vigentes en solo lectura
-- =====================================================================

-- Helpers (security definer: no recursan en RLS)
create or replace function puede_ver_cliente(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin() or exists (select 1 from clientes where id = cid and comercial_id = auth.uid());
$$;

create or replace function puede_ver_visita(vid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin() or exists (
    select 1 from visitas v join clientes c on c.id = v.cliente_id
    where v.id = vid and (c.comercial_id = auth.uid() or v.comercial_id = auth.uid()));
$$;

create or replace function puede_ver_pedido(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pedidos where id = pid and puede_ver_cliente(cliente_id));
$$;

alter table perfiles                  enable row level security;
alter table productos                 enable row level security;
alter table ofertas                   enable row level security;
alter table oferta_productos          enable row level security;
alter table clientes                  enable row level security;
alter table cliente_productos_interes enable row level security;
alter table consentimientos           enable row level security;
alter table visitas                   enable row level security;
alter table visita_productos          enable row level security;
alter table visita_fotos              enable row level security;
alter table plantillas                enable row level security;
alter table campanas                  enable row level security;
alter table mensajes                  enable row level security;
alter table pedidos                   enable row level security;
alter table pedido_lineas             enable row level security;

-- ---------- perfiles ----------
create policy perfiles_ver   on perfiles for select to authenticated using (id = auth.uid() or es_admin());
create policy perfiles_admin on perfiles for all    to authenticated using (es_admin()) with check (es_admin());

-- ---------- catálogo ----------
create policy productos_ver   on productos for select to authenticated using (true);
create policy productos_admin on productos for all    to authenticated using (es_admin()) with check (es_admin());

create policy ofertas_ver   on ofertas for select to authenticated
  using (es_admin() or (activa and current_date between fecha_inicio and fecha_fin));
create policy ofertas_admin on ofertas for all to authenticated using (es_admin()) with check (es_admin());

create policy oferta_productos_ver   on oferta_productos for select to authenticated using (true);
create policy oferta_productos_admin on oferta_productos for all    to authenticated using (es_admin()) with check (es_admin());

create policy plantillas_ver   on plantillas for select to authenticated using (es_admin() or activa);
create policy plantillas_admin on plantillas for all    to authenticated using (es_admin()) with check (es_admin());

-- ---------- clientes ----------
create policy clientes_ver      on clientes for select to authenticated using (es_admin() or comercial_id = auth.uid());
create policy clientes_crear    on clientes for insert to authenticated with check (es_admin() or comercial_id = auth.uid());
create policy clientes_editar   on clientes for update to authenticated
  using (es_admin() or comercial_id = auth.uid()) with check (es_admin() or comercial_id = auth.uid());
create policy clientes_borrar   on clientes for delete to authenticated using (es_admin());   -- derecho de supresión

create policy cpi_ver    on cliente_productos_interes for select to authenticated using (puede_ver_cliente(cliente_id));
create policy cpi_crear  on cliente_productos_interes for insert to authenticated with check (puede_ver_cliente(cliente_id));
create policy cpi_borrar on cliente_productos_interes for delete to authenticated using (puede_ver_cliente(cliente_id));

-- Consentimientos: se añaden, nunca se editan (rastro de auditoría)
create policy consent_ver   on consentimientos for select to authenticated using (puede_ver_cliente(cliente_id));
create policy consent_crear on consentimientos for insert to authenticated
  with check (puede_ver_cliente(cliente_id) and registrado_por = auth.uid());

-- ---------- visitas ----------
-- Con columnas de la propia fila (no buscando por id): así funciona también en
-- INSERT ... ON CONFLICT DO NOTHING, que comprueba la fila antes de que exista.
create policy visitas_ver    on visitas for select to authenticated
  using (es_admin() or comercial_id = auth.uid() or puede_ver_cliente(cliente_id));
create policy visitas_crear  on visitas for insert to authenticated
  with check (es_admin() or (comercial_id = auth.uid() and puede_ver_cliente(cliente_id)));
create policy visitas_editar on visitas for update to authenticated
  using (es_admin() or comercial_id = auth.uid()) with check (es_admin() or comercial_id = auth.uid());
create policy visitas_borrar on visitas for delete to authenticated using (es_admin());

create policy vp_ver   on visita_productos for select to authenticated using (puede_ver_visita(visita_id));
create policy vp_crear on visita_productos for insert to authenticated with check (puede_ver_visita(visita_id));

create policy vf_ver    on visita_fotos for select to authenticated using (puede_ver_visita(visita_id));
create policy vf_crear  on visita_fotos for insert to authenticated with check (puede_ver_visita(visita_id));
create policy vf_borrar on visita_fotos for delete to authenticated using (puede_ver_visita(visita_id));

-- ---------- mensajes y campañas ----------
create policy campanas_admin on campanas for all to authenticated using (es_admin()) with check (es_admin());
create policy campanas_ver   on campanas for select to authenticated
  using (exists (select 1 from mensajes m where m.campana_id = campanas.id and m.comercial_id = auth.uid()));

create policy mensajes_ver    on mensajes for select to authenticated using (puede_ver_cliente(cliente_id));
create policy mensajes_crear  on mensajes for insert to authenticated
  with check (puede_ver_cliente(cliente_id) and (es_admin() or comercial_id = auth.uid()));
create policy mensajes_editar on mensajes for update to authenticated
  using (puede_ver_cliente(cliente_id)) with check (puede_ver_cliente(cliente_id));

-- ---------- pedidos ----------
create policy pedidos_ver    on pedidos for select to authenticated using (puede_ver_cliente(cliente_id));
create policy pedidos_crear  on pedidos for insert to authenticated
  with check (puede_ver_cliente(cliente_id) and (es_admin() or comercial_id = auth.uid()));
create policy pedidos_editar on pedidos for update to authenticated
  using (puede_ver_cliente(cliente_id)) with check (puede_ver_cliente(cliente_id));
create policy pedidos_borrar on pedidos for delete to authenticated using (es_admin());

create policy lineas_ver    on pedido_lineas for select to authenticated using (puede_ver_pedido(pedido_id));
create policy lineas_crear  on pedido_lineas for insert to authenticated with check (puede_ver_pedido(pedido_id));
create policy lineas_editar on pedido_lineas for update to authenticated using (puede_ver_pedido(pedido_id)) with check (puede_ver_pedido(pedido_id));
create policy lineas_borrar on pedido_lineas for delete to authenticated using (puede_ver_pedido(pedido_id));

-- ---------- Storage ----------
-- visitas:   privado, ruta {cliente_id}/{visita_id}/{foto}.jpg
-- productos: lectura pública, escritura admin
insert into storage.buckets (id, name, public) values ('visitas', 'visitas', false), ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "fotos visitas: ver" on storage.objects for select to authenticated
  using (bucket_id = 'visitas' and puede_ver_cliente(((storage.foldername(name))[1])::uuid));
create policy "fotos visitas: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'visitas' and puede_ver_cliente(((storage.foldername(name))[1])::uuid));
create policy "fotos visitas: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'visitas' and es_admin());

create policy "productos: admin escribe" on storage.objects for all to authenticated
  using (bucket_id = 'productos' and es_admin()) with check (bucket_id = 'productos' and es_admin());
