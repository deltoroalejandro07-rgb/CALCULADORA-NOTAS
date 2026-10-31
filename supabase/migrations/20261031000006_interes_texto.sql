-- =====================================================================
-- Sin catálogo: lo que le interesa al cliente se apunta en la visita como texto libre.
-- Solo añade una columna; los productos y ofertas ya guardados se conservan.
-- =====================================================================
alter table visitas add column interes_texto text check (char_length(interes_texto) <= 1000);
