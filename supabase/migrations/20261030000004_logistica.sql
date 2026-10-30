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
