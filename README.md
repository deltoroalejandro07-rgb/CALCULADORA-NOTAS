# CRM HORECA

App web (PWA, móvil primero) para el equipo comercial de una distribuidora al canal hostelería: registro rápido de visitas, ficha y estado de cada cliente, panel diario, catálogo y ofertas, y mensajes por WhatsApp/email con consentimiento (RGPD/LSSI).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, RLS, Storage) · Vitest · Playwright · despliegue en Vercel.

## Estado

| Paso | Contenido | Estado |
|---|---|---|
| 0 | Proyecto base, base de datos y RLS, login por código, navegación, datos demo | ✅ |
| 1 | Registro de visita (sin cobertura) | ⏳ |
| 2 | Lista y ficha de cliente | |
| 3 | Panel Hoy con mapa | |
| 4 | Catálogo y ofertas | |
| 5 | Plantillas, mensajes y campañas | |
| 6 | Panel de dirección | |
| 7 | Importar / exportar y RGPD | |
| 8 | PWA instalable, iconos, guía de cuentas | |

## Arrancar en local

Requisitos: Node 22+, Docker (para Supabase local).

```bash
npm install
cp .env.example .env.local
npm run db:start        # levanta Supabase local y muestra las claves
# copia API_URL → NEXT_PUBLIC_SUPABASE_URL, PUBLISHABLE_KEY y SECRET_KEY a .env.local
npm run db:reset        # aplica migraciones + usuarios y datos de ejemplo
npm run dev             # http://localhost:3000
```

**Entrar en local:** usa uno de estos emails y abre el buzón de pruebas en http://127.0.0.1:54324 para ver el código de 6 cifras.

| Email | Rol |
|---|---|
| `admin@demo.local` | Administrador (ve todo) |
| `ana@demo.local` | Comercial (15 clientes) |
| `luis@demo.local` | Comercial (15 clientes) |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Tests de lógica (estado, temperatura, formatos) |
| `npm run typecheck` / `lint` | Tipos y ESLint |
| `npm run db:reset` | Recrea la base local con migraciones y datos demo |
| `npm run db:tipos` | Regenera `lib/supabase/tipos-bd.ts` tras cambiar el esquema |
| `npm run demo:borrar` | Borra **solo** los datos de ejemplo (`is_seed = true`) |
| `npm run demo:cargar` | Vuelve a cargar los datos de ejemplo |

`demo:borrar` y `demo:cargar` usan la base local; para otra base: `DATABASE_URL="postgresql://…" npm run demo:borrar`.

Recorrido con capturas (con la app en marcha): `CHROMIUM=/ruta/a/chromium node tests/e2e-capturas.mjs carpeta-salida`.

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente y servidor | Clave pública (todo pasa por RLS) |
| `SUPABASE_SECRET_KEY` | solo servidor | Invitar usuarios e importar. Nunca con prefijo `NEXT_PUBLIC_` |

## Estructura

```
app/                  rutas (login, (app)/hoy, clientes, visita, mensajes, mas)
components/           UI
lib/dominio/          reglas de negocio puras (estado, temperatura, tipos)
lib/supabase/         clientes de Supabase y tipos generados
proxy.ts              renueva la sesión y redirige al login
supabase/migrations/  esquema, triggers y políticas RLS
supabase/seed/        usuarios locales, datos demo y script de borrado
tests/                Vitest + recorrido Playwright
```

## Reglas de negocio clave

- **Estado tras una visita** (trigger en BD + `lib/dominio/estado.ts`): hace pedido → cliente; pide oferta o interesado → interesado si era prospecto o perdido; el resto no cambia. Perdido solo se marca a mano.
- **Temperatura** (`lib/dominio/temperatura.ts`): caliente = pedido/oferta/interés ≤ 14 días; templado = eso mismo 15–30 días o pide información ≤ 30 días; frío = el resto. "No estaba el responsable" no cuenta como resultado.
- **Consentimiento** por canal, con historial inmutable. La base de datos rechaza mensajes a clientes sin consentimiento.
- **RLS:** cada comercial ve solo sus clientes y lo que cuelga de ellos; no puede reasignar clientes.

## Desplegar

Lo detallaré paso a paso al terminar la fase 1 (cuentas de Supabase, Vercel, Meta y Brevo). En resumen: crear proyecto Supabase en región UE → `supabase link` + `supabase db push` → importar el repo en Vercel con las variables de entorno → en Supabase, Auth → URL Configuration, poner la URL de Vercel.
