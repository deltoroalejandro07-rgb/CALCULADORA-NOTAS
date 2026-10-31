-- =====================================================================
-- Logística · fase L3: zonas por días, destinos de reparto y albaranes
-- importados (PDF de Holded o a mano) para calcular la ruta óptima.
-- Solo añade; lo único que amplía es lo creado en la migración de logística:
--   · paradas puede apuntar a un destino (sin ficha en el CRM) y a un albarán
--   · mi_reparto() devuelve también esas paradas
-- Clientes, visitas, pedidos y sus permisos no cambian.
-- =====================================================================

-- ---------- Ajustes de planificación ----------
alter table ajustes_logistica
  add column minutos_descarga integer not null default 10 check (minutos_descarga between 1 and 120),
  add column hora_salida      time    not null default '08:00',
  add column volver_almacen   boolean not null default true;

-- ---------- Zonas y días de reparto ----------
create table zonas_reparto (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  dias         smallint[] not null default '{}' check (dias <@ array[1,2,3,4,5,6,7]::smallint[]),  -- 1 = lunes … 7 = domingo
  vehiculo_id  uuid references vehiculos (id) on delete set null,
  color        text,
  activa       boolean not null default true,
  creado_at    timestamptz not null default now()
);

-- ---------- Destinos de reparto (clientes de Holded: no son fichas del CRM) ----------
create table destinos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  direccion         text,
  localidad         text,
  codigo_postal     text,
  telefono          text,
  lat               double precision,
  lng               double precision,
  ubicacion_origen  text check (ubicacion_origen in ('direccion', 'gps', 'manual')),
  zona_id           uuid references zonas_reparto (id) on delete set null,
  ventana_desde     time,                       -- horario prioritario de entrega
  ventana_hasta     time,
  horario_texto     text,                       -- tal cual venía ("antes de las 10")
  notas_acceso      text,
  minutos_descarga  integer check (minutos_descarga between 1 and 120),   -- null = el general
  clave             text not null unique,       -- nombre + dirección normalizados: reconoce repetidos
  creado_at         timestamptz not null default now(),
  actualizado_at    timestamptz not null default now(),
  check (ventana_desde is null or ventana_hasta is null or ventana_desde < ventana_hasta)
);
create index destinos_zona_idx on destinos (zona_id);

-- ---------- Albaranes importados ----------
create table albaranes (
  id            uuid primary key default gen_random_uuid(),
  numero        text,                           -- nº de albarán de Holded
  fecha         date,
  destino_id    uuid not null references destinos (id) on delete restrict,
  lineas        jsonb not null default '[]',    -- [{descripcion, cantidad}]
  bultos        integer check (bultos >= 0),
  notas         text,
  origen        text not null default 'pdf' check (origen in ('pdf', 'manual')),
  archivo_path  text,
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'planificado', 'entregado', 'anulado')),
  creado_por    uuid references perfiles (id) on delete set null default auth.uid(),
  creado_at     timestamptz not null default now()
);
-- Subir dos veces el mismo PDF no duplica albaranes (los manuales sin número sí pueden repetirse:
-- en un unique, los null no chocan entre sí)
alter table albaranes add constraint albaranes_numero_key unique (numero);
create index albaranes_estado_idx on albaranes (estado);

-- ---------- Paradas: también a destinos y albaranes ----------
alter table paradas
  alter column cliente_id drop not null,
  add column destino_id uuid references destinos (id) on delete restrict,
  add column albaran_id uuid references albaranes (id) on delete restrict,
  add column llegada_prevista time,
  add constraint paradas_cliente_o_destino check (cliente_id is not null or destino_id is not null);
create index paradas_albaran_idx on paradas (albaran_id);
-- Un albarán va en una sola parada viva; si la entrega falla vuelve a quedar pendiente
create unique index paradas_albaran_vivo_idx on paradas (albaran_id) where albaran_id is not null and estado <> 'fallida';

-- La protección de entregas registradas, ahora también para paradas sin cliente del CRM
create or replace function proteger_parada() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.estado = 'pendiente'
       or (old.cliente_id is not null and not exists (select 1 from clientes where id = old.cliente_id))
       or not exists (select 1 from rutas where id = old.ruta_id) then
      return old;
    end if;
    raise exception 'Una entrega ya registrada no se puede borrar' using errcode = 'P0001';
  end if;
  if old.estado = 'pendiente' then return new; end if;
  -- Única excepción: borrar el pedido deja la parada sin enlace (las líneas entregadas quedan copiadas)
  if new.pedido_id is null and (to_jsonb(new) - 'pedido_id') = (to_jsonb(old) - 'pedido_id') then return new; end if;
  raise exception 'La entrega ya está registrada y no se puede modificar' using errcode = 'P0001';
end $$;

-- El estado del albarán sigue al de su parada
create or replace function albaran_sigue_parada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.albaran_id is not null then
      update albaranes set estado = 'planificado' where id = new.albaran_id and estado = 'pendiente';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.albaran_id is not null and old.estado = 'pendiente' then
      update albaranes set estado = 'pendiente' where id = old.albaran_id and estado = 'planificado';
    end if;
    return old;
  end if;
  if new.albaran_id is not null and old.estado = 'pendiente' and new.estado <> 'pendiente' then
    update albaranes set estado = case when new.estado = 'entregada' then 'entregado' else 'pendiente' end
      where id = new.albaran_id;
  end if;
  return new;
end $$;

create trigger albaran_sigue_parada after insert or update or delete on paradas
  for each row execute function albaran_sigue_parada();

-- ---------- Permisos: solo la oficina (el conductor lo recibe por mi_reparto) ----------
alter table zonas_reparto enable row level security;
alter table destinos      enable row level security;
alter table albaranes     enable row level security;

create policy zonas_ver   on zonas_reparto for select to authenticated using (true);
create policy zonas_admin on zonas_reparto for all    to authenticated using (es_admin()) with check (es_admin());
create policy destinos_admin  on destinos  for all to authenticated using (es_admin()) with check (es_admin());
create policy albaranes_admin on albaranes for all to authenticated using (es_admin()) with check (es_admin());

-- Los PDF subidos: privados, solo la oficina
insert into storage.buckets (id, name, public) values ('albaranes', 'albaranes', false)
  on conflict (id) do nothing;
create policy "albaranes pdf: oficina" on storage.objects for all to authenticated
  using (bucket_id = 'albaranes' and es_admin()) with check (bucket_id = 'albaranes' and es_admin());

-- ---------- mi_reparto(): paradas de clientes del CRM o de destinos ----------
create or replace function mi_reparto() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(ruta order by ruta ->> 'fecha', ruta ->> 'creado_at'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', r.id,
      'fecha', r.fecha,
      'estado', r.estado,
      'notas', r.notas,
      'creado_at', r.creado_at,
      'vehiculo', (select jsonb_build_object('nombre', v.nombre, 'matricula', v.matricula) from vehiculos v where v.id = r.vehiculo_id),
      'almacen', (select jsonb_build_object('direccion', a.almacen_direccion, 'lat', a.almacen_lat, 'lng', a.almacen_lng) from ajustes_logistica a),
      'paradas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'orden', p.orden,
          'estado', p.estado,
          'entrega_id', p.entrega_id,
          'realizada_at', p.realizada_at,
          'notas_oficina', p.notas_oficina,
          'pedido_id', p.pedido_id,
          'llegada_prevista', to_char(p.llegada_prevista, 'HH24:MI'),
          'albaran', al.numero,
          'cliente', case when c.id is not null then jsonb_build_object(
              'id', c.id, 'nombre', c.nombre_negocio, 'direccion', c.direccion, 'localidad', c.localidad,
              'telefono', c.telefono, 'contacto', c.contacto_nombre, 'lat', c.lat, 'lng', c.lng,
              'horario_entrega', ce.horario_entrega, 'notas_acceso', ce.notas_acceso)
            else jsonb_build_object(
              'id', d.id, 'nombre', d.nombre, 'direccion', d.direccion, 'localidad', d.localidad,
              'telefono', d.telefono, 'contacto', null, 'lat', d.lat, 'lng', d.lng,
              'horario_entrega', coalesce(d.horario_texto,
                case when d.ventana_desde is not null or d.ventana_hasta is not null
                  then concat_ws('-', to_char(d.ventana_desde, 'HH24:MI'), to_char(d.ventana_hasta, 'HH24:MI')) end),
              'notas_acceso', d.notas_acceso) end,
          'lineas', case
            when p.pedido_id is not null then coalesce((
              select jsonb_agg(jsonb_build_object('producto_id', l.producto_id, 'descripcion', l.descripcion, 'cantidad', l.cantidad) order by l.descripcion)
              from pedido_lineas l where l.pedido_id = p.pedido_id), '[]'::jsonb)
            when al.id is not null then coalesce((
              select jsonb_agg(jsonb_build_object('producto_id', null, 'descripcion', x ->> 'descripcion', 'cantidad', coalesce((x ->> 'cantidad')::numeric, 1)))
              from jsonb_array_elements(al.lineas) x), '[]'::jsonb)
            else '[]'::jsonb end
        ) order by p.orden)
        from paradas p
        left join clientes c on c.id = p.cliente_id
        left join clientes_entrega ce on ce.cliente_id = c.id
        left join destinos d on d.id = p.destino_id
        left join albaranes al on al.id = p.albaran_id
        where p.ruta_id = r.id), '[]'::jsonb)
    ) as ruta
    from rutas r
    where r.conductor_id = auth.uid()
      and r.fecha between hoy_madrid() - 7 and hoy_madrid() + 1
      and (r.fecha >= hoy_madrid() - 1 or r.estado <> 'terminada')
  ) t;
$$;
