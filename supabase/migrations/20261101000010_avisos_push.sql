-- Avisos en el móvil (notificaciones push). Cada móvil que activa los avisos guarda aquí su
-- dirección de envío. Cada usuario ve y borra solo las suyas; el envío lo hace el servidor.
create table push_suscripciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references perfiles (id) on delete cascade default auth.uid(),
  endpoint    text not null unique check (char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  creado_at   timestamptz not null default now()
);
create index push_suscripciones_usuario_idx on push_suscripciones (usuario_id);

alter table push_suscripciones enable row level security;
create policy push_propias on push_suscripciones for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

notify pgrst, 'reload schema';
