-- Reparto en el orden que pide cada cliente: cada cliente de reparto recuerda su posición de siempre.
alter table destinos add column if not exists orden_habitual integer check (orden_habitual > 0);

notify pgrst, 'reload schema';
