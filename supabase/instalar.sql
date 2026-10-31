-- =====================================================================
-- CRM HORECA · Instalación completa para pegar en el SQL Editor de Supabase
-- Generado con supabase/generar-instalar.sh. Ejecutar UNA sola vez en un proyecto vacío.
-- =====================================================================

-- ---- migrations/20261021000001_esquema.sql ----
-- =====================================================================
-- CRM HORECA · Esquema inicial (Supabase / Postgres 15+)
-- Migración: supabase/migrations/0001_esquema.sql
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;   -- búsqueda aproximada y duplicados

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type rol_usuario        as enum ('admin', 'comercial');
create type tipo_negocio       as enum ('bar', 'restaurante', 'cafeteria', 'hotel', 'pub', 'catering', 'otro');
create type estado_cliente     as enum ('prospecto', 'interesado', 'cliente', 'perdido');
create type tipo_visita        as enum ('puerta_fria', 'propaganda', 'seguimiento', 'degustacion', 'toma_pedido', 'incidencia');
create type resultado_visita   as enum ('no_estaba', 'sin_interes', 'pide_info', 'interesado', 'pide_oferta', 'hace_pedido');
create type categoria_producto as enum ('cerveza', 'refrescos', 'agua', 'vino', 'licores', 'cafe', 'alimentacion', 'limpieza_menaje');
create type canal_mensaje      as enum ('whatsapp', 'email');
create type estado_mensaje     as enum ('preparado', 'enviado', 'entregado', 'leido', 'respondido', 'fallido');
create type origen_consentimiento as enum ('verbal_visita', 'formulario_papel', 'whatsapp', 'email', 'web');
create type tipo_foto          as enum ('escaparate', 'barra', 'competencia', 'otra');

-- ---------------------------------------------------------------------
-- Usuarios (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  email       text not null,
  telefono    text,
  rol         rol_usuario not null default 'comercial',
  activo      boolean not null default true,
  creado_at   timestamptz not null default now()
);

-- Alta automática del perfil al invitar/registrar un usuario
create or replace function crear_perfil_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)), new.email);
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function crear_perfil_nuevo_usuario();

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin' and activo);
$$;

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table productos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  referencia     text,
  categoria      categoria_producto not null,
  formato        text,                                  -- "Barril 30 L", "Caja 24 x 33 cl"
  precio_tarifa  numeric(10,2) not null check (precio_tarifa >= 0),  -- € sin IVA
  destacado      boolean not null default false,
  activo         boolean not null default true,
  imagen_path    text,                                  -- bucket "productos"
  is_seed        boolean not null default false,
  creado_at      timestamptz not null default now()
);

create table ofertas (
  id                  uuid primary key default gen_random_uuid(),
  titulo              text not null,
  descripcion         text,
  condicion           text,                             -- "3+1 en barril", "-10 % primer pedido"
  descuento_pct       numeric(5,2) check (descuento_pct between 0 and 100),
  fecha_inicio        date not null,
  fecha_fin           date not null,
  activa              boolean not null default true,
  -- Segmento: array vacío = sin filtro en ese criterio
  segmento_tipos      tipo_negocio[]   not null default '{}',
  segmento_zonas      text[]           not null default '{}',
  segmento_estados    estado_cliente[] not null default '{}',
  segmento_productos  uuid[]           not null default '{}',  -- interés en alguno de estos
  is_seed             boolean not null default false,
  creado_at           timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create table oferta_productos (
  oferta_id   uuid not null references ofertas (id) on delete cascade,
  producto_id uuid not null references productos (id) on delete cascade,
  primary key (oferta_id, producto_id)
);

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table clientes (
  id                     uuid primary key default gen_random_uuid(),  -- el móvil puede generarlo (alta sin cobertura)
  nombre_negocio         text not null,
  tipo                   tipo_negocio not null default 'bar',
  contacto_nombre        text,
  contacto_cargo         text,
  telefono               text,                    -- normalizado E.164: +34600111222
  email                  text,
  direccion              text,
  localidad              text,
  codigo_postal          text,
  zona                   text,
  lat                    double precision,
  lng                    double precision,
  horario_visita         text,                    -- "L-V 16:00-18:00"
  estado                 estado_cliente not null default 'prospecto',
  motivo_perdida         text,
  comercial_id           uuid references perfiles (id) on delete set null,
  proveedor_actual       text,
  volumen_estimado_eur   numeric(10,2) check (volumen_estimado_eur >= 0),   -- €/mes
  etiquetas              text[] not null default '{}',
  notas                  text,
  -- Consentimiento comercial (copia del último registro en "consentimientos")
  consiente_whatsapp     boolean not null default false,
  consiente_email        boolean not null default false,
  consentimiento_at      timestamptz,
  consentimiento_origen  origen_consentimiento,
  -- Campos calculados por triggers
  ultima_visita_at       timestamptz,
  ultimo_resultado       resultado_visita,        -- último resultado "útil" (ignora no_estaba)
  ultimo_resultado_at    timestamptz,
  ultimo_pedido_at       timestamptz,
  proxima_accion         text,
  proxima_accion_fecha   date,
  is_seed                boolean not null default false,
  creado_por             uuid references perfiles (id) on delete set null default auth.uid(),
  creado_at              timestamptz not null default now(),
  actualizado_at         timestamptz not null default now()
);

create index clientes_comercial_idx   on clientes (comercial_id);
create index clientes_estado_idx      on clientes (estado);
create index clientes_proxima_idx     on clientes (proxima_accion_fecha);
create index clientes_zona_idx        on clientes (zona);
create index clientes_telefono_idx    on clientes (telefono);
create index clientes_nombre_trgm_idx on clientes using gin (nombre_negocio gin_trgm_ops);

create table cliente_productos_interes (
  cliente_id        uuid not null references clientes (id) on delete cascade,
  producto_id       uuid not null references productos (id) on delete cascade,
  origen_visita_id  uuid,
  creado_at         timestamptz not null default now(),
  primary key (cliente_id, producto_id)
);
create index cpi_producto_idx on cliente_productos_interes (producto_id);

-- Registro inmutable de consentimientos y bajas (RGPD / LSSI)
create table consentimientos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes (id) on delete cascade,
  canal          canal_mensaje not null,
  otorgado       boolean not null,               -- false = baja
  origen         origen_consentimiento not null,
  evidencia      text,                           -- "Firmado en hoja de visita", "Respondió BAJA"
  registrado_por uuid references perfiles (id) on delete set null default auth.uid(),
  registrado_at  timestamptz not null default now()
);
create index consentimientos_cliente_idx on consentimientos (cliente_id, registrado_at desc);

-- ---------------------------------------------------------------------
-- Visitas
-- ---------------------------------------------------------------------
create table visitas (
  id                    uuid primary key default gen_random_uuid(),  -- generado en el móvil → reintentos idempotentes
  cliente_id            uuid not null references clientes (id) on delete cascade,
  comercial_id          uuid not null references perfiles (id) default auth.uid(),
  fecha                 timestamptz not null default now(),          -- hora real de la visita (no la de sincronización)
  lat                   double precision,
  lng                   double precision,
  precision_m           real,
  tipo                  tipo_visita not null,
  resultado             resultado_visita not null,
  material_entregado    text[] not null default '{}',
  notas                 text,
  proxima_accion        text,
  proxima_accion_fecha  date,
  is_seed               boolean not null default false,
  sincronizado_at       timestamptz not null default now()
);
create index visitas_cliente_idx   on visitas (cliente_id, fecha desc);
create index visitas_comercial_idx on visitas (comercial_id, fecha desc);

create table visita_productos (
  visita_id    uuid not null references visitas (id) on delete cascade,
  producto_id  uuid not null references productos (id) on delete cascade,
  relacion     text not null check (relacion in ('presentado', 'interes')),
  primary key (visita_id, producto_id, relacion)
);

create table visita_fotos (
  id            uuid primary key default gen_random_uuid(),
  visita_id     uuid not null references visitas (id) on delete cascade,
  storage_path  text not null,                  -- bucket "visitas": {cliente_id}/{visita_id}/{id}.jpg
  tipo          tipo_foto not null default 'otra',
  creado_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Mensajes y campañas
-- ---------------------------------------------------------------------
create table plantillas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  canal      canal_mensaje not null,
  asunto     text,                 -- solo email
  cuerpo     text not null,        -- {contacto} {negocio} {comercial} {oferta} {productos} {fecha_fin}
  activa     boolean not null default true,
  is_seed    boolean not null default false,
  creado_at  timestamptz not null default now()
);

create table campanas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  canal         canal_mensaje not null,
  plantilla_id  uuid references plantillas (id) on delete set null,
  oferta_id     uuid references ofertas (id) on delete set null,
  filtro        jsonb not null default '{}',   -- segmento usado, para auditoría
  creado_por    uuid references perfiles (id) on delete set null default auth.uid(),
  is_seed       boolean not null default false,
  creado_at     timestamptz not null default now()
);

create table mensajes (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes (id) on delete cascade,
  canal         canal_mensaje not null,
  asunto        text,
  texto         text not null,
  oferta_id     uuid references ofertas (id) on delete set null,
  campana_id    uuid references campanas (id) on delete set null,
  plantilla_id  uuid references plantillas (id) on delete set null,
  comercial_id  uuid references perfiles (id) on delete set null default auth.uid(),
  estado        estado_mensaje not null default 'preparado',
  enviado_at    timestamptz,
  proveedor_id  text,              -- fase 2: wamid de Meta / id de Brevo
  is_seed       boolean not null default false,
  creado_at     timestamptz not null default now()
);
create index mensajes_cliente_idx on mensajes (cliente_id, creado_at desc);
create index mensajes_campana_idx on mensajes (campana_id);

-- ---------------------------------------------------------------------
-- Pedidos (sencillo)
-- ---------------------------------------------------------------------
create table pedidos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes (id) on delete cascade,
  comercial_id   uuid references perfiles (id) on delete set null default auth.uid(),
  visita_id      uuid references visitas (id) on delete set null,
  fecha          date not null default current_date,
  notas          text,
  importe_total  numeric(12,2) not null default 0,   -- € sin IVA, lo mantiene un trigger
  is_seed        boolean not null default false,
  creado_at      timestamptz not null default now()
);
create index pedidos_cliente_idx on pedidos (cliente_id, fecha desc);

create table pedido_lineas (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references pedidos (id) on delete cascade,
  producto_id      uuid references productos (id) on delete set null,
  descripcion      text not null,                 -- copia del nombre por si cambia el catálogo
  cantidad         numeric(10,2) not null check (cantidad > 0),
  precio_unitario  numeric(10,2) not null check (precio_unitario >= 0),
  importe          numeric(12,2) generated always as (round(cantidad * precio_unitario, 2)) stored
);

-- =====================================================================
-- Lógica de negocio en triggers
-- (la misma regla está en lib/dominio/estado.ts y se testea con Vitest)
-- =====================================================================

create or replace function siguiente_estado(actual estado_cliente, r resultado_visita)
returns estado_cliente language sql immutable as $$
  select case
    when r = 'hace_pedido'                                                 then 'cliente'::estado_cliente
    when r in ('pide_oferta', 'interesado') and actual in ('prospecto', 'perdido') then 'interesado'::estado_cliente
    else actual
  end;
$$;

-- Visita nueva → actualizar cliente. Solo la visita más reciente pisa
-- última visita / próxima acción (las visitas offline pueden llegar desordenadas).
create or replace function tras_insertar_visita() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c clientes%rowtype;
  mas_reciente boolean;
begin
  select * into c from clientes where id = new.cliente_id for update;
  mas_reciente := c.ultima_visita_at is null or new.fecha >= c.ultima_visita_at;

  update clientes set
    estado               = siguiente_estado(c.estado, new.resultado),
    ultima_visita_at     = greatest(coalesce(c.ultima_visita_at, new.fecha), new.fecha),
    ultimo_resultado     = case when new.resultado <> 'no_estaba'
                                 and (c.ultimo_resultado_at is null or new.fecha >= c.ultimo_resultado_at)
                                then new.resultado else c.ultimo_resultado end,
    ultimo_resultado_at  = case when new.resultado <> 'no_estaba'
                                 and (c.ultimo_resultado_at is null or new.fecha >= c.ultimo_resultado_at)
                                then new.fecha else c.ultimo_resultado_at end,
    ultimo_pedido_at     = case when new.resultado = 'hace_pedido'
                                then greatest(coalesce(c.ultimo_pedido_at, new.fecha), new.fecha)
                                else c.ultimo_pedido_at end,
    proxima_accion       = case when mas_reciente then new.proxima_accion       else c.proxima_accion end,
    proxima_accion_fecha = case when mas_reciente then new.proxima_accion_fecha else c.proxima_accion_fecha end,
    actualizado_at       = now()
  where id = new.cliente_id;
  return new;
end $$;

create trigger visita_actualiza_cliente after insert on visitas
  for each row execute function tras_insertar_visita();

-- Productos marcados como "le interesa" en la visita → intereses del cliente
create or replace function tras_insertar_visita_producto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.relacion = 'interes' then
    insert into cliente_productos_interes (cliente_id, producto_id, origen_visita_id)
    select v.cliente_id, new.producto_id, new.visita_id from visitas v where v.id = new.visita_id
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger visita_producto_interes after insert on visita_productos
  for each row execute function tras_insertar_visita_producto();

-- Pedido → cliente pasa a "cliente"
create or replace function tras_insertar_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update clientes set
    estado           = 'cliente',
    ultimo_pedido_at = greatest(coalesce(ultimo_pedido_at, new.fecha::timestamptz), new.fecha::timestamptz),
    actualizado_at   = now()
  where id = new.cliente_id;
  return new;
end $$;

create trigger pedido_actualiza_cliente after insert on pedidos
  for each row execute function tras_insertar_pedido();

-- Total del pedido siempre cuadrado con sus líneas
create or replace function recalcular_total_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.pedido_id, old.pedido_id);
begin
  update pedidos set importe_total = coalesce((select sum(importe) from pedido_lineas where pedido_id = pid), 0)
  where id = pid;
  return null;
end $$;

create trigger pedido_lineas_total after insert or update or delete on pedido_lineas
  for each row execute function recalcular_total_pedido();

-- Consentimiento registrado → copia en la ficha del cliente
create or replace function tras_insertar_consentimiento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update clientes set
    consiente_whatsapp    = case when new.canal = 'whatsapp' then new.otorgado else consiente_whatsapp end,
    consiente_email       = case when new.canal = 'email'    then new.otorgado else consiente_email end,
    consentimiento_at     = new.registrado_at,
    consentimiento_origen = new.origen,
    actualizado_at        = now()
  where id = new.cliente_id;
  return new;
end $$;

create trigger consentimiento_actualiza_cliente after insert on consentimientos
  for each row execute function tras_insertar_consentimiento();

-- Sin consentimiento en ese canal no se puede preparar ni enviar un mensaje
create or replace function comprobar_consentimiento_mensaje() returns trigger
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select case new.canal when 'whatsapp' then consiente_whatsapp else consiente_email end
    into ok from clientes where id = new.cliente_id;
  if not coalesce(ok, false) then
    raise exception 'El cliente no tiene consentimiento registrado para %', new.canal
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger mensaje_requiere_consentimiento before insert on mensajes
  for each row execute function comprobar_consentimiento_mensaje();

-- Un comercial no puede reasignar clientes ni quedárselos de otro
create or replace function proteger_asignacion_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = service role (seed, importación en servidor)
  if auth.uid() is null or es_admin() then
    new.actualizado_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.comercial_id := auth.uid();
  elsif new.comercial_id is distinct from old.comercial_id then
    raise exception 'Solo el administrador puede reasignar clientes';
  end if;
  new.actualizado_at := now();
  return new;
end $$;

create trigger clientes_proteger_asignacion before insert or update on clientes
  for each row execute function proteger_asignacion_cliente();

-- Búsqueda de duplicados antes de dar de alta (ve todos los clientes, devuelve lo mínimo)
create or replace function buscar_posibles_duplicados(p_nombre text, p_telefono text default null)
returns table (id uuid, nombre_negocio text, zona text, comercial text, es_mio boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.nombre_negocio, c.zona, p.nombre, c.comercial_id = auth.uid()
  from clientes c left join perfiles p on p.id = c.comercial_id
  where (p_telefono is not null and c.telefono = p_telefono)
     or similarity(c.nombre_negocio, p_nombre) > 0.45
  order by similarity(c.nombre_negocio, p_nombre) desc
  limit 5;
$$;

revoke execute on function buscar_posibles_duplicados(text, text) from public, anon;
grant  execute on function buscar_posibles_duplicados(text, text) to authenticated;

-- ---- migrations/20261021000002_rls.sql ----
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

-- ---- migrations/20261023000003_campanas_comerciales.sql ----
-- =====================================================================
-- Cada comercial envía las campañas a sus propios clientes desde su móvil
-- (enlaces wa.me / mailto), así que también puede crear campañas.
-- =====================================================================

drop policy if exists campanas_ver on campanas;

create policy campanas_ver on campanas for select to authenticated
  using (es_admin() or creado_por = auth.uid()
         or exists (select 1 from mensajes m where m.campana_id = campanas.id and m.comercial_id = auth.uid()));

create policy campanas_crear on campanas for insert to authenticated
  with check (creado_por = auth.uid());

-- ---- migrations/20261030000004_logistica.sql ----
-- =====================================================================
-- Logística · fases L1 + L2: vehículos, rutas de reparto y entregas con firma.
-- Solo AÑADE tablas, funciones y políticas nuevas: no cambia nada de lo existente
-- (clientes, pedidos y sus permisos siguen igual).
--
--   admin      → planifica: vehículos, almacén, rutas y paradas
--   conductor  → cualquier usuario al que se le asigne una ruta; ve SOLO sus
--                paradas a través de mi_reparto() y registra cada entrega una vez
--   comercial  → ve el estado de entrega y el albarán de sus clientes
-- =====================================================================

create type estado_ruta   as enum ('planificada', 'en_curso', 'terminada');
create type estado_parada as enum ('pendiente', 'entregada', 'fallida');

-- Fecha de hoy en España (la base de datos trabaja en UTC)
create or replace function hoy_madrid() returns date
language sql stable as $$ select (now() at time zone 'Europe/Madrid')::date; $$;

-- ---------------------------------------------------------------------
-- Almacén (punto de salida de las rutas): una sola fila
-- ---------------------------------------------------------------------
create table ajustes_logistica (
  id                 boolean primary key default true check (id),
  almacen_direccion  text,
  almacen_lat        double precision,
  almacen_lng        double precision,
  actualizado_at     timestamptz not null default now()
);
insert into ajustes_logistica (id) values (true);

-- ---------------------------------------------------------------------
-- Vehículos
-- ---------------------------------------------------------------------
create table vehiculos (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,                       -- "Furgoneta 1"
  matricula            text,
  capacidad_kg         numeric(10,2) check (capacidad_kg >= 0),
  capacidad_bultos     integer check (capacidad_bultos >= 0),
  etiqueta_ambiental   text check (etiqueta_ambiental in ('0', 'ECO', 'C', 'B', 'sin')),
  conductor_habitual   uuid references perfiles (id) on delete set null,
  activo               boolean not null default true,
  notas                text,
  creado_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Datos de entrega del cliente (tabla aparte: la de clientes no se toca)
-- ---------------------------------------------------------------------
create table clientes_entrega (
  cliente_id       uuid primary key references clientes (id) on delete cascade,
  horario_entrega  text,                                    -- "L-V 8:00-11:00"
  notas_acceso     text,                                    -- "Entrar por la calle de atrás"
  actualizado_at   timestamptz not null default now(),
  actualizado_por  uuid references perfiles (id) on delete set null default auth.uid()
);

-- ---------------------------------------------------------------------
-- Rutas y paradas
-- ---------------------------------------------------------------------
create table rutas (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null,
  vehiculo_id   uuid references vehiculos (id) on delete set null,
  conductor_id  uuid references perfiles (id) on delete set null,
  estado        estado_ruta not null default 'planificada',
  notas         text,
  creado_por    uuid references perfiles (id) on delete set null default auth.uid(),
  creado_at     timestamptz not null default now(),
  iniciada_at   timestamptz,
  terminada_at  timestamptz
);
create index rutas_fecha_idx     on rutas (fecha);
create index rutas_conductor_idx on rutas (conductor_id, fecha);

create table paradas (
  id                  uuid primary key default gen_random_uuid(),
  ruta_id             uuid not null references rutas (id) on delete cascade,
  orden               integer not null,
  cliente_id          uuid not null references clientes (id) on delete cascade,
  pedido_id           uuid references pedidos (id) on delete set null,
  notas_oficina       text,
  estado              estado_parada not null default 'pendiente',
  -- Entrega: la registra el conductor UNA vez (registrar_entrega) y luego no se puede cambiar
  entrega_id          uuid unique,                          -- generado en el móvil: reintentar no duplica
  realizada_at        timestamptz,                          -- hora del móvil al entregar
  registrada_at       timestamptz,                          -- hora del servidor al recibirla
  registrada_por      uuid references perfiles (id) on delete set null,
  firmante            text,
  firma_path          text,
  fotos               text[] not null default '{}',
  lineas              jsonb not null default '[]',          -- [{descripcion, producto_id, pedida, entregada}]
  envases_entregados  integer not null default 0 check (envases_entregados >= 0),
  envases_recogidos   integer not null default 0 check (envases_recogidos >= 0),
  cobrado             numeric(10,2) check (cobrado >= 0),
  forma_cobro         text,
  motivo_fallo        text,
  observaciones       text,
  lat                 double precision,
  lng                 double precision,
  precision_m         double precision,
  creado_at           timestamptz not null default now()
);
create index paradas_ruta_idx    on paradas (ruta_id, orden);
create index paradas_cliente_idx on paradas (cliente_id);
-- Un pedido va en una sola parada viva; si la entrega falla se puede volver a planificar
create unique index paradas_pedido_vivo_idx on paradas (pedido_id) where pedido_id is not null and estado <> 'fallida';

-- Registro de lo que pasa en el reparto (solo se añade)
create table eventos_reparto (
  id          bigint generated always as identity primary key,
  ruta_id     uuid references rutas (id) on delete cascade,
  parada_id   uuid references paradas (id) on delete cascade,
  tipo        text not null,
  detalle     jsonb,
  usuario_id  uuid default auth.uid(),
  creado_at   timestamptz not null default now()
);
create index eventos_reparto_ruta_idx on eventos_reparto (ruta_id, creado_at);

-- Pedidos que aún no van en ninguna ruta (o cuya entrega falló)
create view pedidos_por_repartir with (security_invoker = true) as
  select p.*
  from pedidos p
  where not exists (select 1 from paradas pa where pa.pedido_id = p.id and pa.estado <> 'fallida');

-- ---------------------------------------------------------------------
-- Reglas
-- ---------------------------------------------------------------------

-- Una entrega registrada no se modifica ni se borra (salvo al borrar el cliente: derecho de supresión)
create or replace function proteger_parada() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.estado = 'pendiente'
       or not exists (select 1 from clientes where id = old.cliente_id)
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

create trigger proteger_parada before update or delete on paradas
  for each row execute function proteger_parada();

-- Una ruta con entregas hechas no se borra
create or replace function proteger_ruta() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from paradas where ruta_id = old.id and estado <> 'pendiente') then
    raise exception 'La ruta tiene entregas registradas y no se puede borrar' using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger proteger_ruta before delete on rutas
  for each row execute function proteger_ruta();

-- Al registrar una entrega: la ruta pasa a "en curso" y, si no queda nada, a "terminada"
create or replace function tras_registrar_parada() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  quedan integer;
begin
  if old.estado = 'pendiente' and new.estado <> 'pendiente' then
    insert into eventos_reparto (ruta_id, parada_id, tipo, detalle, usuario_id)
    values (new.ruta_id, new.id, 'parada_' || new.estado,
            jsonb_build_object('entrega_id', new.entrega_id, 'realizada_at', new.realizada_at, 'motivo', new.motivo_fallo),
            new.registrada_por);
    select count(*) into quedan from paradas where ruta_id = new.ruta_id and estado = 'pendiente';
    update rutas
      set estado = case when quedan = 0 then 'terminada'::estado_ruta else 'en_curso'::estado_ruta end,
          iniciada_at = coalesce(iniciada_at, now()),
          terminada_at = case when quedan = 0 then now() else null end
      where id = new.ruta_id;
    if quedan = 0 then
      insert into eventos_reparto (ruta_id, tipo, usuario_id) values (new.ruta_id, 'ruta_terminada', new.registrada_por);
    end if;
  end if;
  return new;
end $$;

create trigger tras_registrar_parada after update on paradas
  for each row execute function tras_registrar_parada();

-- ---------------------------------------------------------------------
-- Permisos (helpers security definer: no recursan en RLS)
-- ---------------------------------------------------------------------
create or replace function conduce_ruta(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rutas where id = rid and conductor_id = auth.uid());
$$;

create or replace function puede_ver_parada(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin() or exists (
    select 1 from paradas p join rutas r on r.id = p.ruta_id
    where p.id = pid and (r.conductor_id = auth.uid() or puede_ver_cliente(p.cliente_id)));
$$;

create or replace function puede_registrar_parada(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin() or exists (
    select 1 from paradas p join rutas r on r.id = p.ruta_id where p.id = pid and r.conductor_id = auth.uid());
$$;

alter table ajustes_logistica enable row level security;
alter table vehiculos         enable row level security;
alter table clientes_entrega  enable row level security;
alter table rutas             enable row level security;
alter table paradas           enable row level security;
alter table eventos_reparto   enable row level security;

create policy ajustes_log_ver   on ajustes_logistica for select to authenticated using (true);
create policy ajustes_log_admin on ajustes_logistica for update to authenticated using (es_admin()) with check (es_admin());

create policy vehiculos_ver   on vehiculos for select to authenticated using (true);
create policy vehiculos_admin on vehiculos for all    to authenticated using (es_admin()) with check (es_admin());

create policy cent_ver   on clientes_entrega for select to authenticated using (puede_ver_cliente(cliente_id));
create policy cent_editar on clientes_entrega for all  to authenticated
  using (puede_ver_cliente(cliente_id)) with check (puede_ver_cliente(cliente_id));

create policy rutas_ver   on rutas for select to authenticated using (es_admin() or conductor_id = auth.uid());
create policy rutas_admin on rutas for all    to authenticated using (es_admin()) with check (es_admin());

create policy paradas_ver   on paradas for select to authenticated
  using (es_admin() or conduce_ruta(ruta_id) or puede_ver_cliente(cliente_id));
create policy paradas_admin on paradas for all to authenticated using (es_admin()) with check (es_admin());

create policy eventos_rep_ver on eventos_reparto for select to authenticated using (es_admin() or conduce_ruta(ruta_id));

-- ---------------------------------------------------------------------
-- Lo que necesita el conductor, sin abrirle el CRM: sus rutas de ayer a mañana
-- (y las que dejó sin terminar), con los datos justos de cada parada.
-- ---------------------------------------------------------------------
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
          'cliente', jsonb_build_object(
            'id', c.id, 'nombre', c.nombre_negocio, 'direccion', c.direccion, 'localidad', c.localidad,
            'telefono', c.telefono, 'contacto', c.contacto_nombre, 'lat', c.lat, 'lng', c.lng,
            'horario_entrega', ce.horario_entrega, 'notas_acceso', ce.notas_acceso),
          'lineas', coalesce((
            select jsonb_agg(jsonb_build_object('producto_id', l.producto_id, 'descripcion', l.descripcion, 'cantidad', l.cantidad) order by l.descripcion)
            from pedido_lineas l where l.pedido_id = p.pedido_id), '[]'::jsonb)
        ) order by p.orden)
        from paradas p
        join clientes c on c.id = p.cliente_id
        left join clientes_entrega ce on ce.cliente_id = c.id
        where p.ruta_id = r.id), '[]'::jsonb)
    ) as ruta
    from rutas r
    where r.conductor_id = auth.uid()
      and r.fecha between hoy_madrid() - 7 and hoy_madrid() + 1
      and (r.fecha >= hoy_madrid() - 1 or r.estado <> 'terminada')
  ) t;
$$;

-- ---------------------------------------------------------------------
-- Registrar una entrega (o un intento fallido). Idempotente: el móvil puede
-- reintentarla las veces que haga falta con el mismo entrega_id.
--   'registrada'   → guardada ahora
--   'ya_registrada'→ era un reintento: ya estaba guardada
--   'conflicto'    → la parada ya tenía OTRA entrega distinta (no se pisa)
-- ---------------------------------------------------------------------
create or replace function registrar_entrega(p_parada uuid, p_entrega uuid, p_estado estado_parada, p_datos jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare
  p paradas%rowtype;
begin
  if p_estado = 'pendiente' then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  select * into p from paradas where id = p_parada for update;
  if not found then
    raise exception 'La parada no existe' using errcode = 'P0002';
  end if;
  if not puede_registrar_parada(p_parada) then
    raise exception 'Sin permiso para esta parada' using errcode = '42501';
  end if;
  if p.entrega_id = p_entrega then return 'ya_registrada'; end if;
  if p.estado <> 'pendiente' then return 'conflicto'; end if;
  if p_estado = 'fallida' and coalesce(trim(p_datos ->> 'motivo_fallo'), '') = '' then
    raise exception 'Falta el motivo' using errcode = '22023';
  end if;

  update paradas set
    estado             = p_estado,
    entrega_id         = p_entrega,
    realizada_at       = coalesce((p_datos ->> 'realizada_at')::timestamptz, now()),
    registrada_at      = now(),
    registrada_por     = auth.uid(),
    firmante           = nullif(trim(p_datos ->> 'firmante'), ''),
    firma_path         = nullif(p_datos ->> 'firma_path', ''),
    fotos              = coalesce(array(select jsonb_array_elements_text(coalesce(p_datos -> 'fotos', '[]'::jsonb))), '{}'),
    lineas             = coalesce(p_datos -> 'lineas', '[]'::jsonb),
    envases_entregados = coalesce((p_datos ->> 'envases_entregados')::integer, 0),
    envases_recogidos  = coalesce((p_datos ->> 'envases_recogidos')::integer, 0),
    cobrado            = nullif(p_datos ->> 'cobrado', '')::numeric,
    forma_cobro        = nullif(p_datos ->> 'forma_cobro', ''),
    motivo_fallo       = nullif(trim(p_datos ->> 'motivo_fallo'), ''),
    observaciones      = nullif(trim(p_datos ->> 'observaciones'), ''),
    lat                = (p_datos ->> 'lat')::double precision,
    lng                = (p_datos ->> 'lng')::double precision,
    precision_m        = (p_datos ->> 'precision_m')::double precision
  where id = p_parada;
  return 'registrada';
end $$;

revoke execute on function registrar_entrega(uuid, uuid, estado_parada, jsonb) from public, anon;
revoke execute on function mi_reparto() from public, anon;
grant execute on function registrar_entrega(uuid, uuid, estado_parada, jsonb) to authenticated;
grant execute on function mi_reparto() to authenticated;

-- ---------------------------------------------------------------------
-- Firmas y fotos de entrega: privadas, ruta <parada_id>/<fichero>.
-- Se suben una vez y no se modifican.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('entregas', 'entregas', false)
  on conflict (id) do nothing;

create policy "entregas: ver" on storage.objects for select to authenticated
  using (bucket_id = 'entregas' and puede_ver_parada(((storage.foldername(name))[1])::uuid));
create policy "entregas: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'entregas' and puede_registrar_parada(((storage.foldername(name))[1])::uuid));

-- ---- migrations/20261031000005_reparto_zonas.sql ----
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

-- ---- migrations/20261031000006_interes_texto.sql ----
-- =====================================================================
-- Sin catálogo: lo que le interesa al cliente se apunta en la visita como texto libre.
-- Solo añade una columna; los productos y ofertas ya guardados se conservan.
-- =====================================================================
alter table visitas add column interes_texto text check (char_length(interes_texto) <= 1000);
