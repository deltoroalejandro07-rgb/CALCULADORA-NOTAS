-- =====================================================================
-- DATOS DE EJEMPLO (todos con is_seed = true y etiqueta "demo").
-- Para borrarlos: supabase/seed/borrar_demo.sql  (npm run demo:borrar)
--
-- Los clientes se reparten entre los comerciales que existan en ese momento,
-- así que en producción conviene invitar antes a los comerciales.
-- Los teléfonos son ficticios (+34 600 000 0XX): no enviar mensajes reales.
-- =====================================================================

-- ---------- Catálogo ----------
insert into productos (nombre, categoria, formato, precio_tarifa, destacado, is_seed) values
  ('Cerveza rubia lager',          'cerveza',        'Barril 30 L',            92.00, true,  true),
  ('Cerveza rubia lager',          'cerveza',        'Caja 24 × 33 cl',        21.50, false, true),
  ('Cerveza tostada artesana',     'cerveza',        'Caja 12 × 33 cl',        24.90, true,  true),
  ('Cerveza sin alcohol',          'cerveza',        'Caja 24 × 25 cl',        17.80, false, true),
  ('Refresco de cola',             'refrescos',      'Caja 24 × 20 cl vidrio', 14.40, false, true),
  ('Tónica premium',               'refrescos',      'Caja 24 × 20 cl',        19.20, true,  true),
  ('Refresco de naranja',          'refrescos',      'Caja 24 × 20 cl vidrio', 13.90, false, true),
  ('Agua mineral',                 'agua',           'Caja 35 × 50 cl',         8.75, false, true),
  ('Agua con gas',                 'agua',           'Caja 24 × 33 cl vidrio', 11.60, false, true),
  ('Vino tinto Rioja crianza',     'vino',           'Caja 6 × 75 cl',         39.00, true,  true),
  ('Vino blanco Rueda verdejo',    'vino',           'Caja 6 × 75 cl',         31.50, false, true),
  ('Vermut rojo de grifo',         'vino',           'Bag-in-box 15 L',        68.00, true,  true),
  ('Ginebra London Dry',           'licores',        'Botella 70 cl',          13.20, false, true),
  ('Ron añejo',                    'licores',        'Botella 70 cl',          14.80, false, true),
  ('Whisky blended',               'licores',        'Botella 70 cl',          12.90, false, true),
  ('Café en grano mezcla 80/20',   'cafe',           'Saco 1 kg',              14.50, true,  true),
  ('Café descafeinado monodosis',  'cafe',           'Caja 100 uds',           19.90, false, true),
  ('Aceite de oliva virgen extra', 'alimentacion',   'Garrafa 5 L',            34.00, false, true),
  ('Patatas fritas artesanas',     'alimentacion',   'Caja 12 × 150 g',        16.80, false, true),
  ('Aceitunas manzanilla',         'alimentacion',   'Lata 5 kg',              18.40, false, true),
  ('Detergente lavavajillas',      'limpieza_menaje','Garrafa 12 kg',          27.50, false, true),
  ('Servilletas 30×30',            'limpieza_menaje','Caja 2.400 uds',         22.00, false, true);

-- ---------- Clientes ----------
with comerciales as (
  select id, row_number() over (order by creado_at, id) - 1 as n, count(*) over () as total
  from perfiles where rol = 'comercial' and activo
),
datos (i, nombre, tipo, contacto, cargo, zona, direccion, lat, lng, horario, proveedor, volumen) as (values
  ( 1, 'Bar El Rincón de Paco',     'bar',         'Paco Jiménez',     'Dueño',       'Centro',    'C/ de la Cruz 12',          40.4152, -3.7020, 'L-V 16:00-18:00', 'Distribuciones Norte', 1800),
  ( 2, 'Cafetería La Plaza',        'cafeteria',   'Marta Ruiz',       'Encargada',   'Centro',    'Plaza Mayor 5',             40.4155, -3.7074, 'L-S 10:00-12:00', 'Cafés del Sur',         900),
  ( 3, 'Restaurante Casa Lola',     'restaurante', 'Lola Martín',      'Dueña',       'Chamberí',  'C/ Ponzano 33',             40.4426, -3.7034, 'M-V 11:00-12:30', 'Bebidas Castilla',     3200),
  ( 4, 'Taberna Los Arcos',         'bar',         'Antonio Gil',      'Dueño',       'Chamberí',  'C/ Fuencarral 140',         40.4330, -3.7020, 'L-V 17:00-19:00', null,                   1500),
  ( 5, 'Hotel Gran Vía Suites',     'hotel',       'Sofía Navarro',    'F&B Manager', 'Centro',    'Gran Vía 44',               40.4201, -3.7058, 'L-V 09:30-11:00', 'Grupo Hostelero XL',   6500),
  ( 6, 'Pub The Corner',            'pub',         'Dani López',       'Encargado',   'Malasaña',  'C/ del Pez 21',             40.4237, -3.7058, 'M-S 19:00-20:30', 'Distribuciones Norte', 2400),
  ( 7, 'Bar Manolo',                'bar',         'Manuel Sanz',      'Dueño',       'Lavapiés',  'C/ Argumosa 8',             40.4083, -3.6990, 'L-V 11:00-13:00', null,                    800),
  ( 8, 'Restaurante El Puerto',     'restaurante', 'Javier Ortega',    'Chef',        'Salamanca', 'C/ Jorge Juan 27',          40.4237, -3.6837, 'M-V 16:30-18:00', 'Bebidas Castilla',     4100),
  ( 9, 'Cafetería Dulce Aroma',     'cafeteria',   'Elena Castro',     'Dueña',       'Retiro',    'C/ Ibiza 15',               40.4180, -3.6735, 'L-V 15:00-17:00', 'Cafés del Sur',        1100),
  (10, 'Catering Sabores',          'catering',    'Rubén Molina',     'Gerente',     'Salamanca', 'C/ Ayala 70',               40.4280, -3.6770, 'L-V 09:00-11:00', null,                   5200),
  (11, 'Bar La Esquina',            'bar',         'Carmen Vega',      'Dueña',       'Lavapiés',  'C/ Ave María 30',           40.4090, -3.7010, 'L-V 16:00-18:00', 'Distribuciones Norte', 1200),
  (12, 'Gastrobar Fusión',          'restaurante', 'Iván Romero',      'Socio',       'Malasaña',  'C/ San Vicente Ferrer 18',  40.4250, -3.7040, 'M-V 12:00-13:00', null,                   2900),
  (13, 'Cervecería La Espuma',      'bar',         'Luis Herrera',     'Dueño',       'Chamberí',  'C/ Trafalgar 9',            40.4320, -3.7030, 'L-V 17:00-19:00', 'Bebidas Castilla',     2600),
  (14, 'Hostal Centro Sol',         'hotel',       'Pilar Domínguez',  'Recepción',   'Centro',    'C/ Montera 10',             40.4180, -3.7030, 'L-V 10:00-12:00', null,                   1300),
  (15, 'Pub Medianoche',            'pub',         'Sergio Prieto',    'Dueño',       'Malasaña',  'C/ Velarde 4',              40.4270, -3.7030, 'J-S 20:00-21:00', 'Grupo Hostelero XL',   3100),
  (16, 'Cafetería Retiro',          'cafeteria',   'Noelia Iglesias',  'Encargada',   'Retiro',    'C/ Menéndez Pelayo 61',     40.4120, -3.6780, 'L-V 15:30-17:00', null,                    950),
  (17, 'Bodega Antigua',            'bar',         'Ramón Cano',       'Dueño',       'Lavapiés',  'C/ Lavapiés 40',            40.4080, -3.7020, 'L-S 12:00-13:30', 'Vinos Rivera',         1700),
  (18, 'Restaurante Mar y Tierra',  'restaurante', 'Beatriz Flores',   'Gerente',     'Retiro',    'C/ Doctor Castelo 22',      40.4210, -3.6760, 'M-V 16:00-18:00', 'Bebidas Castilla',     3800),
  (19, 'Bar Deportivo',             'bar',         'José Luis Reyes',  'Dueño',       'Salamanca', 'C/ Don Ramón de la Cruz 45',40.4290, -3.6800, 'L-V 10:00-12:00', null,                   1400),
  (20, 'Terraza Las Vistas',        'bar',         'Andrea Méndez',    'Encargada',   'Centro',    'C/ Mayor 70',               40.4150, -3.7120, 'L-V 11:00-12:30', 'Distribuciones Norte', 2200),
  (21, 'Café Literario',            'cafeteria',   'Alberto Peña',     'Dueño',       'Malasaña',  'C/ Espíritu Santo 12',      40.4250, -3.7050, 'L-V 16:00-18:00', 'Cafés del Sur',         700),
  (22, 'Hotel Jardín',              'hotel',       'Cristina Lozano',  'Compras',     'Chamberí',  'C/ Santa Engracia 80',      40.4380, -3.6990, 'L-V 09:00-10:30', 'Grupo Hostelero XL',   5800),
  (23, 'Mesón El Hidalgo',          'restaurante', 'Fernando Arias',   'Dueño',       'Lavapiés',  'C/ Embajadores 50',         40.4060, -3.7030, 'M-V 11:30-12:30', null,                   2700),
  (24, 'Bar Los Amigos',            'bar',         'Rosa Benítez',     'Dueña',       'Retiro',    'C/ Narváez 30',             40.4200, -3.6720, 'L-V 17:00-19:00', null,                   1000),
  (25, 'Coctelería Azul',           'pub',         'Marcos Vidal',     'Bartender',   'Salamanca', 'C/ Lagasca 60',             40.4270, -3.6850, 'M-S 18:00-19:30', 'Grupo Hostelero XL',   3400),
  (26, 'Churrería San Ginés 2',     'cafeteria',   'Teresa Campos',    'Encargada',   'Centro',    'C/ Arenal 15',              40.4170, -3.7070, 'L-V 15:00-16:30', null,                   1600),
  (27, 'Restaurante La Huerta',     'restaurante', 'Pablo Serrano',    'Chef',        'Chamberí',  'C/ Eloy Gonzalo 14',        40.4340, -3.7010, 'M-V 16:00-17:30', 'Bebidas Castilla',     3000),
  (28, 'Bar El Tranvía',            'bar',         'Lucía Fuentes',    'Dueña',       'Salamanca', 'C/ Goya 90',                40.4250, -3.6760, 'L-V 10:30-12:00', null,                   1100),
  (29, 'Catering Eventos Plus',     'catering',    'Óscar Pastor',     'Director',    'Retiro',    'Av. Menéndez Pelayo 3',     40.4150, -3.6800, 'L-V 09:00-10:30', null,                   7000),
  (30, 'Vermutería Del Barrio',     'bar',         'Irene Calvo',      'Dueña',       'Malasaña',  'C/ Palma 22',               40.4260, -3.7070, 'L-S 12:00-13:00', 'Vinos Rivera',         1300)
)
insert into clientes (nombre_negocio, tipo, contacto_nombre, contacto_cargo, telefono, email, direccion, localidad,
                      zona, lat, lng, horario_visita, comercial_id, proveedor_actual, volumen_estimado_eur,
                      etiquetas, is_seed)
select d.nombre, d.tipo::tipo_negocio, d.contacto, d.cargo,
       '+3460000' || lpad(d.i::text, 4, '0'),
       'demo' || d.i || '@ejemplo.invalid',
       d.direccion, 'Madrid', d.zona, d.lat, d.lng, d.horario,
       (select id from comerciales where n = (d.i - 1) % total),
       d.proveedor, d.volumen,
       array['demo'] || case when d.i % 4 = 0 then array['terraza'] else '{}'::text[] end,
       true
from datos d;

-- ---------- Visitas (relativas a hoy, para que los paneles tengan vida) ----------
-- Patrón por cliente: hasta 3 visitas con resultados distintos.
with c as (
  select id, comercial_id, row_number() over (order by nombre_negocio) as i
  from clientes where is_seed
),
plan (paso, dias, tipo, resultado) as (values
  (1, 40, 'propaganda',   'no_estaba'),
  (2, 25, 'puerta_fria',  'pide_info'),
  (3,  0, 'seguimiento',  null)          -- el resultado final depende del cliente
),
finales (k, resultado, dias) as (values
  (0, 'hace_pedido', 3), (1, 'pide_oferta', 2), (2, 'interesado', 6), (3, 'sin_interes', 10),
  (4, 'pide_oferta', 18), (5, 'pide_info', 35), (6, 'interesado', 1)
)
insert into visitas (cliente_id, comercial_id, fecha, lat, lng, tipo, resultado, notas,
                     proxima_accion, proxima_accion_fecha, is_seed)
select c.id,
       coalesce(c.comercial_id, (select id from perfiles where rol = 'admin' order by creado_at limit 1)),
       now() - make_interval(days => case when p.paso = 3 then f.dias else p.dias + f.dias end) - interval '3 hours',
       null, null,
       p.tipo::tipo_visita,
       coalesce(p.resultado, f.resultado)::resultado_visita,
       case when p.paso = 3 then 'Visita de ejemplo (demo).' end,
       case when p.paso = 3 and f.resultado in ('pide_oferta', 'interesado', 'pide_info') then 'Llevar oferta y muestras'
            when p.paso = 3 and f.resultado = 'hace_pedido' then 'Confirmar entrega' end,
       case when p.paso = 3 and f.resultado <> 'sin_interes' then current_date + (c.i % 9 - 3)::int end,
       true
from c
join finales f on f.k = c.i % 7
join plan p on p.paso <= case when c.i % 5 = 0 then 1 else 3 end   -- 1 de cada 5 solo recibió propaganda
where c.comercial_id is not null or exists (select 1 from perfiles where rol = 'admin')
order by c.i, p.paso;

-- Productos presentados / de interés en la última visita
insert into visita_productos (visita_id, producto_id, relacion)
select v.id, p.id, r.relacion
from (
  select distinct on (cliente_id) id, cliente_id, row_number() over () as n
  from visitas where is_seed order by cliente_id, fecha desc
) v
cross join lateral (
  select id from productos where is_seed order by md5(v.id::text || id::text) limit 3
) p
cross join (values ('presentado'), ('interes')) r(relacion)
where v.n % 3 <> 0 or r.relacion = 'presentado';

-- Consentimiento: dos de cada tres clientes lo han dado por WhatsApp
insert into consentimientos (cliente_id, canal, otorgado, origen, evidencia, registrado_por)
select id, 'whatsapp', true, 'verbal_visita', 'Dado de palabra en la visita (demo)', comercial_id
from (select id, comercial_id, row_number() over (order by nombre_negocio) as i from clientes where is_seed) c
where i % 3 <> 0;

insert into consentimientos (cliente_id, canal, otorgado, origen, evidencia, registrado_por)
select id, 'email', true, 'formulario_papel', 'Hoja de alta firmada (demo)', comercial_id
from (select id, comercial_id, row_number() over (order by nombre_negocio) as i from clientes where is_seed) c
where i % 2 = 0;

-- Pedido sencillo para los que hicieron pedido
with p as (
  insert into pedidos (cliente_id, comercial_id, fecha, notas, is_seed)
  select cliente_id, comercial_id, (fecha at time zone 'Europe/Madrid')::date, 'Pedido de ejemplo (demo)', true
  from visitas where is_seed and resultado = 'hace_pedido'
  returning id
)
insert into pedido_lineas (pedido_id, producto_id, descripcion, cantidad, precio_unitario)
select p.id, pr.id, pr.nombre || ' · ' || pr.formato, 1 + (abs(hashtext(p.id::text || pr.id::text)) % 4), pr.precio_tarifa
from p
cross join lateral (select * from productos where is_seed order by md5(p.id::text || id::text) limit 3) pr;

-- ---------- Ofertas ----------
insert into ofertas (titulo, descripcion, condicion, descuento_pct, fecha_inicio, fecha_fin,
                     segmento_tipos, segmento_estados, is_seed)
values
  ('Arranque de barril', 'Para bares que cambian de proveedor de cerveza.', '3 barriles + 1 de regalo', null,
   current_date - 5, current_date + 25, '{bar,pub}', '{prospecto,interesado}', true),
  ('Vermut de grifo para el aperitivo', 'Instalación del grifo gratis con el primer bag-in-box.', 'Instalación gratis', null,
   current_date - 2, current_date + 40, '{bar,restaurante}', '{}', true),
  ('Café: 10 % primer pedido', 'Mezcla 80/20 y descafeinado en monodosis.', '-10 % en el primer pedido', 10,
   current_date, current_date + 30, '{cafeteria,hotel}', '{}', true);

insert into oferta_productos (oferta_id, producto_id)
select o.id, p.id from ofertas o join productos p on p.is_seed and (
  (o.titulo = 'Arranque de barril' and p.categoria = 'cerveza' and p.formato like 'Barril%') or
  (o.titulo like 'Vermut%'         and p.nombre like 'Vermut%') or
  (o.titulo like 'Café%'           and p.categoria = 'cafe'))
where o.is_seed;

update ofertas o set segmento_productos = array(select producto_id from oferta_productos where oferta_id = o.id)
where o.is_seed;

-- ---------- Plantillas ----------
insert into plantillas (nombre, canal, asunto, cuerpo, is_seed) values
  ('Gracias por la visita', 'whatsapp', null,
   'Hola {contacto}, soy {comercial}. Gracias por atenderme hoy en {negocio}. Quedo a tu disposición para lo que necesites.' || E'\n\n' ||
   'Si no quieres recibir más mensajes, responde BAJA.', true),
  ('Oferta personalizada', 'whatsapp', null,
   'Hola {contacto}, te escribe {comercial}. Para {negocio} tenemos esta oferta: *{oferta}*. Incluye: {productos}. Válida hasta el {fecha_fin}. ¿Te la preparo?' || E'\n\n' ||
   'Si no quieres recibir más mensajes, responde BAJA.', true),
  ('Oferta por email', 'email', '{oferta} para {negocio}',
   'Hola {contacto}:' || E'\n\n' || 'Te escribo para contarte nuestra oferta "{oferta}", con {productos}. Está disponible hasta el {fecha_fin}.' || E'\n\n' ||
   'Un saludo,' || E'\n' || '{comercial}', true);
