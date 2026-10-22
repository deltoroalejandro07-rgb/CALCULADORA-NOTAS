# Guía de cuentas y claves

Qué cuentas necesita el CRM, qué está ya hecho y cómo terminar lo que falta.

| Servicio | Para qué | Coste | Estado |
|---|---|---|---|
| **Supabase** | Base de datos, acceso, fotos | Gratis (plan Free) | ✅ Creado |
| **Vercel** | Publicar la app | Gratis (plan Hobby) | ✅ Publicada en `crm-comercial-mu.vercel.app` |
| **Clave secreta de Supabase en Vercel** | Dar de alta usuarios desde el CRM | — | ⏳ Paso 1 |
| **Actualizar la base de datos** | Cambios de esquema nuevos | — | ⏳ Paso 2 |
| **Brevo** (correo) | Solo si quieres entrar con código por email o, en fase 2, campañas por email | Gratis hasta 300 emails/día | Opcional |
| **Meta – WhatsApp Business** | Fase 2: envío automático y respuestas en la app | Pago por conversación | Fase 2 |

---

## Paso 1 · Clave secreta de Supabase en Vercel

Sin ella, la pantalla **Más → Usuarios** no puede dar de alta comerciales.

1. **Supabase** → ⚙️ *Project Settings* → **API Keys** → en *Secret keys*, copia la clave `sb_secret_…`.
   *No la compartas con nadie ni la pegues en un chat: da acceso total a la base de datos.*
2. **Vercel** → proyecto `crm-comercial` → **Settings** → **Environment Variables** → *Add*:
   - Key: `SUPABASE_SECRET_KEY`
   - Value: la clave copiada
   - Environments: *Production and Preview*
3. **Vercel** → **Deployments** → en el primero de la lista, **⋯** → **Redeploy**.

Comprobación: en el CRM, **Más → Usuarios** ya no muestra el aviso amarillo.

## Paso 2 · Actualizar la base de datos

Cada vez que el esquema cambia hay un fichero nuevo en `supabase/migrations/`. Hay que ejecutarlo **una vez** en tu Supabase:

1. Abre en GitHub el fichero de la migración (rama `main`), pulsa *Raw* y copia todo.
2. **Supabase → SQL Editor → New query** → pega → **Run**. Debe decir *Success*.

Migraciones pendientes de aplicar en producción:

- `supabase/migrations/20261023000003_campanas_comerciales.sql` (los comerciales pueden lanzar sus propias campañas).

> Si algún día montas un proyecto de Supabase nuevo, basta con pegar `supabase/instalar.sql`, que ya incluye todas las migraciones.

## Paso 3 (opcional) · Correo propio con Brevo

**Con email y contraseña no hace falta.** Solo si prefieres que entren con un código por email (o para las campañas por email de la fase 2). El correo de serie de Supabase **solo envía a los miembros de tu cuenta de Supabase** y unos pocos emails por hora; Brevo es gratis hasta 300 emails al día y tiene servidores en la UE.

### 3.1 Crear la cuenta y el remitente
1. Regístrate en **https://www.brevo.com** (plan *Free*).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: nombre `CRM [tu empresa]` y un email tuyo (por ejemplo `crm@tuempresa.es`). Confírmalo desde el email que te llega.
   - Si tienes dominio propio, en **Domains** autentícalo (te da unos registros DNS para tu proveedor de dominio): los emails llegarán mejor y no a spam.
3. **SMTP & API → SMTP**: verás *SMTP server* (`smtp-relay.brevo.com`), *Port* (`587`), *Login* y un botón para **generar una SMTP key**. Genera una y cópiala.

### 3.2 Conectarlo a Supabase
**Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP**:

| Campo | Valor |
|---|---|
| Sender email | el remitente confirmado en Brevo |
| Sender name | `CRM [tu empresa]` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | el *Login* de Brevo |
| Password | la *SMTP key* generada |

Guarda. Después, en **Authentication → Rate Limits**, sube *emails por hora* a 30 o más.

### 3.3 Email con el código de 6 cifras
Con SMTP propio ya se pueden editar las plantillas. **Authentication → Emails → Templates → Magic link or OTP**:

- **Subject:** `Tu código de acceso`
- **Body:**
  ```html
  <h2>Tu código de acceso</h2>
  <p>Escribe este código en la app para entrar:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
  <p>O pulsa este enlace desde el mismo móvil: <a href="{{ .ConfirmationURL }}">Entrar en el CRM</a></p>
  <p>Caduca en 1 hora. Si no has pedido entrar, ignora este correo.</p>
  ```

Así sirve tanto el código (imprescindible con la app instalada en iPhone) como el enlace.

## Paso 4 · Instalar la app en el móvil

- **Android (Chrome):** abre `https://crm-comercial-mu.vercel.app`, entra, y en el menú **⋮ → Instalar aplicación** (o *Añadir a pantalla de inicio*).
- **iPhone (Safari):** abre la dirección, pulsa **Compartir ⬆︎ → Añadir a pantalla de inicio**. Dentro de la app instalada entra con tu **email y contraseña**.

La primera vez abre la app con cobertura: a partir de ahí, «Nueva visita» funciona sin red.

## Paso 5 · Dar de alta a los comerciales

**Más → Usuarios → Dar de alta**: nombre, email y contraseña (botón *Generar* para una fácil de dictar). Pásale la dirección de la app, su email y la contraseña; podrá cambiarla en **Más → Cambiar mi contraseña**. Si la olvida, en Usuarios → **Cambiar contraseña**.

**Tu propia contraseña (administrador):** es la que pusiste al crear tu usuario en Supabase. Si no la recuerdas, entra una vez con el enlace del email («Prefiero recibir un email para entrar») y cámbiala en **Más → Cambiar mi contraseña**.

## Datos de ejemplo (opcional)

Para ver el CRM con datos: en el **SQL Editor** pega y ejecuta `supabase/seed/datos_demo.sql` (crea 30 bares marcados **DEMO**, repartidos entre los comerciales que existan). Para quitarlos: `supabase/seed/borrar_demo.sql`. Los datos reales no se tocan.

---

## Fase 2 · WhatsApp Business Cloud API (Meta)

En la fase 1 los mensajes se envían con enlaces `wa.me` desde el móvil del comercial (gratis, sin aprobación). La API oficial permite enviar sin abrir WhatsApp, recibir las respuestas en el CRM y ver *entregado/leído*. Lo que hará falta:

1. **Cuenta de Meta Business** (business.facebook.com) verificada con los datos de la empresa.
2. **Un número de teléfono dedicado** que no esté ya en la app de WhatsApp (o migrarlo).
3. En **developers.facebook.com** crear una app de tipo *Business* y añadir el producto **WhatsApp** → te da un *Phone number ID*, un *WhatsApp Business Account ID* y un token.
4. **Plantillas aprobadas por Meta** para los mensajes comerciales (se redactan en el *WhatsApp Manager*; la aprobación tarda de minutos a 1 día).
5. **Método de pago** en Meta: los mensajes de marketing se pagan por conversación (en España, unos céntimos cada una; consulta la tarifa vigente).
6. Un **webhook** apuntando a la app (lo programaré en la fase 2) para recibir respuestas y estados.

Cuando quieras empezar la fase 2, ten listos el número dedicado y la cuenta de Meta Business verificada.
