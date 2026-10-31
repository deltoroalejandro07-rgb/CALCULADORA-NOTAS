-- Agenda personal: reuniones, tareas y notas. Cada usuario ve y edita solo lo suyo.
create table agenda (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references perfiles (id) on delete cascade default auth.uid(),
  tipo         text not null default 'reunion' check (tipo in ('reunion', 'tarea', 'nota')),
  titulo       text not null check (char_length(titulo) between 1 and 200),
  fecha        date,                    -- las notas pueden no tener fecha
  hora_inicio  time,
  hora_fin     time,
  lugar        text check (char_length(lugar) <= 300),
  cliente_id   uuid references clientes (id) on delete set null,
  notas        text check (char_length(notas) <= 5000),
  hecha        boolean not null default false,
  creado_at    timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  check (hora_fin is null or hora_inicio is null or hora_fin >= hora_inicio)
);
create index agenda_usuario_fecha_idx on agenda (usuario_id, fecha);

alter table agenda enable row level security;
create policy agenda_propia on agenda for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

notify pgrst, 'reload schema';
