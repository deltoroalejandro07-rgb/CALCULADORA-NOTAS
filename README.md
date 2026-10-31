# CRM dliverygo

App web instalable (PWA, móvil primero) para el equipo comercial de una distribuidora al canal hostelería: registro de visitas en menos de 30 segundos (también sin cobertura), ficha y estado de cada cliente, panel diario con ruta, catálogo y ofertas, mensajes y campañas por WhatsApp y email con consentimiento (RGPD/LSSI), panel de dirección e importación/exportación.

**Producción:** https://crm-comercial-mu.vercel.app · **Cuentas y claves pendientes:** [`docs/GUIA-CUENTAS.md`](docs/GUIA-CUENTAS.md) · **Textos de privacidad:** [`docs/TEXTO-RGPD.md`](docs/TEXTO-RGPD.md)

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, RLS, Storage) · Dexie (IndexedDB) · Leaflet + OpenStreetMap · Vitest · Playwright · Vercel.

## Qué hace (fase 1)

| Pantalla | Para qué |
|---|---|
| **Hoy** | Seguimientos vencidos y de hoy, oportunidades calientes, clientes sin visitar +30 días y ruta del día en el mapa (ordenada desde tu posición, con enlace a Google Maps). |
| **Nueva visita (+)** | Cliente cercano por GPS o alta rápida con aviso de duplicados, resultado, productos presentados / de interés, nota o dictado, fotos, material, próxima acción y consentimiento. **Funciona sin cobertura** y se sube sola al volver la red. |
| **Clientes** | Búsqueda, filtros (estado, temperatura, tipo, zona, vencidos…), mapa, alta. **Ficha**: llamar, WhatsApp, email, cómo llegar, próxima acción, intereses, ofertas que le encajan, consentimiento por canal, historial (visitas con fotos, mensajes, pedidos), pedido sencillo, exportar datos (RGPD). |
| **Mensajes** | Historial de envíos, plantillas con variables, envío individual y **campañas por segmento** (abre WhatsApp/email con el texto personalizado y lo registra). Solo a clientes con consentimiento; aviso de baja automático. |
| **Más** | Catálogo (destacados, nº de interesados), ofertas con segmento y vista previa, tema claro/oscuro, cerrar sesión. Para el administrador: panel de dirección, usuarios e importar/exportar. |
| **Logística** (admin) | Vehículos y almacén; rutas por día con los pedidos por repartir, orden por cercanía, hoja de carga; entregas con firma y **albarán** imprimible. |
| **Ruta automática** (admin) | Subir los PDF de albarán de Holded (se leen sin IA: cliente, dirección de envío, productos, campos «Horario» y «Ruta»), alta manual, zonas por días de la semana y **cálculo de la mejor ruta** (ventanas horarias, descarga, capacidad, varios vehículos; OpenRouteService con perfil de camión o estimación). Al aceptar, la ruta llega al conductor con la hora prevista de cada parada. |
| **Mi reparto** | La app del conductor (cualquier usuario con una ruta asignada): ruta del día descargada en el móvil, navegar/llamar, **entrega con firma** (cantidades, envases retornables, cobro, fotos) o incidencia. **Funciona sin cobertura**; cada entrega se registra una sola vez y no se puede modificar. |

**Acceso:** email y contraseña (el administrador la pone al dar de alta y cada uno puede cambiarla); como alternativa, código/enlace por email.

**Roles:** el *administrador* lo ve todo y gestiona catálogo, ofertas, plantillas, usuarios e importación. El *comercial* ve y edita solo sus clientes (lo garantiza RLS en la base de datos, no solo la interfaz), registra visitas y pedidos y lanza campañas a sus clientes.

## Arrancar en local

Requisitos: Node 22+ y Docker (Supabase local).

```bash
npm install
cp .env.example .env.local
npm run db:start        # levanta Supabase local e imprime las claves
# copia API_URL → NEXT_PUBLIC_SUPABASE_URL, PUBLISHABLE_KEY y SECRET_KEY a .env.local
npm run db:reset        # migraciones + usuarios y datos de ejemplo
npm run dev             # http://localhost:3000
```

**Entrar en local:** «Prefiero recibir un email para entrar» con uno de estos emails; el código llega al buzón de pruebas http://127.0.0.1:54324 (los usuarios demo no tienen contraseña).

| Email | Rol |
|---|---|
| `admin@demo.local` | Administrador |
| `ana@demo.local` | Comercial (15 clientes) |
| `luis@demo.local` | Comercial (15 clientes) |

El service worker (uso sin cobertura) solo se activa en producción: `npm run build && npm start`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest: reglas de negocio + integración con Supabase local (se salta si no está levantado) |
| `npm run typecheck` / `lint` | Tipos y ESLint |
| `npm run db:start` / `db:reset` | Supabase local / recrear con migraciones y datos demo |
| `npm run db:tipos` | Regenera `lib/supabase/tipos-bd.ts` tras cambiar el esquema |
| `npm run db:instalar-sql` | Regenera `supabase/instalar.sql` (todas las migraciones en un fichero para el SQL Editor) |
| `npm run demo:cargar` / `demo:borrar` | Carga / borra **solo** los datos de ejemplo (`is_seed`). Otra base: `DATABASE_URL=… npm run demo:borrar` |

**Recorridos con navegador** (Supabase local con datos demo y `npm run build && npm start`; `CHROMIUM=/ruta` es opcional):

| Script | Cubre |
|---|---|
| `node tests/e2e-capturas.mjs <dir>` | Login, navegación, permisos, tema oscuro |
| `node tests/e2e-visita.mjs <dir>` | Visita con y sin cobertura, arranque sin red, subida automática |
| `node tests/e2e-clientes.mjs <dir>` | Lista, filtros, mapa, ficha, edición, consentimiento, pedido, RGPD |
| `node tests/e2e-enlace.mjs` | Acceso con el enlace del email |
| `node tests/e2e-fase1.mjs <dir>` | Hoy, usuarios, catálogo, ofertas, plantillas, campañas, dirección, importar/exportar |
| `node tests/e2e-planificar.mjs <dir>` | Ruta automática: zonas, subir PDF de Holded, no duplicar, alta manual, calcular, aceptar y entregar |
| `node tests/e2e-reparto.mjs <dir>` | Logística: planificar ruta, entregar con firma sin cobertura, arranque sin red, subida y albarán |

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente y servidor | Clave pública (todo pasa por RLS) |
| `SUPABASE_SECRET_KEY` | solo servidor | Dar de alta y bloquear usuarios. Nunca con prefijo `NEXT_PUBLIC_` |

## Estructura

```
app/(app)/            pantallas con sesión: hoy, clientes, visita, mensajes, ofertas, catalogo, direccion, ajustes, mas
app/api/              exportar clientes (CSV/XLSX) y exportación RGPD de un cliente
app/auth/confirmar    destino del enlace del email de acceso
components/           UI por pantalla
lib/dominio/          reglas de negocio puras y testeadas (estado, temperatura, segmentos, plantillas, ruta, importación…)
lib/datos/            consultas del servidor
lib/offline/          copia local (IndexedDB) y cola de sincronización idempotente
lib/supabase/         clientes de Supabase y tipos generados
public/sw.js          service worker (abre «Nueva visita» sin red)
proxy.ts              renueva la sesión y redirige al login
supabase/migrations/  esquema, triggers y políticas RLS
supabase/seed/        usuarios locales, datos demo y borrado
docs/                 guía de cuentas y textos RGPD
tests/                Vitest y recorridos Playwright
```

## Reglas de negocio

- **Estado tras una visita** (trigger en BD + `lib/dominio/estado.ts`): hace pedido → cliente; pide oferta o interesado → interesado si era prospecto o perdido; el resto no cambia. *Perdido* es manual y exige motivo. Un pedido también convierte en cliente.
- **Temperatura** (`lib/dominio/temperatura.ts`): caliente = pedido/oferta/interés ≤ 14 días; templado = eso mismo a 15–30 días o *pide información* ≤ 30 días; frío = el resto. Los días cuentan desde el último resultado útil («no estaba» no cuenta).
- **Consentimiento** por canal con historial inmutable; la base de datos rechaza mensajes sin él; todo mensaje comercial lleva aviso de baja.
- **Sin cobertura:** IDs generados en el móvil y subida idempotente (reintentar nunca duplica). Al cerrar sesión se borran los datos del móvil (con aviso si queda algo sin subir). En iPhone la subida ocurre al abrir la app.
- **Reparto:** la ruta se descarga en el móvil (base local propia, separada de la de visitas). La firma y las fotos se guardan primero en el móvil y solo se liberan cuando el servidor confirma la entrega; `registrar_entrega` es idempotente y, si otra entrega distinta ya estaba registrada, la del móvil queda como «conflicto» sin perderse. Una entrega registrada no se puede modificar ni borrar (trigger). El conductor no ve el CRM: recibe solo sus paradas con `mi_reparto()`.

## Desplegar

1. **Supabase** (región UE): pegar `supabase/instalar.sql` en el SQL Editor. *Authentication → Sign In / Providers*: desactivar *Allow new users to sign up*.
2. **Vercel:** importar el repositorio (rama `main`) con las tres variables de entorno. Las funciones corren en `dub1` (Irlanda, junto a la base de datos; `vercel.json`).
3. **Supabase → Authentication → URL Configuration:** *Site URL* = URL de Vercel; *Redirect URLs* += `https://TU-APP.vercel.app/**`.
4. **Primer administrador:** *Authentication → Users → Add user* y en el SQL Editor `update perfiles set rol = 'admin' where email = '…';`
5. **Comerciales:** *Más → Usuarios* con email y contraseña (requiere `SUPABASE_SECRET_KEY`). El correo propio (Brevo) es opcional: ver `docs/GUIA-CUENTAS.md`.

Cada push a `main` se publica solo en Vercel. Si un cambio añade una migración nueva, hay que ejecutarla en el SQL Editor de producción.

## Fase 2 (pendiente)

WhatsApp Business Cloud API (plantillas aprobadas, respuestas y estados), campañas de email con baja automática (Brevo), automatizaciones (agradecimiento tras visita, recordatorios, oferta a quien no responde, aviso de clientes sin pedir), asistente con IA (resumen de ficha, redacción de mensajes, sugerencia de producto), planificador de rutas por zona y pedidos enviados al almacén por email/PDF.
