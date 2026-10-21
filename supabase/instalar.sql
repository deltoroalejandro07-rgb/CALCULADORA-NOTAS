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
