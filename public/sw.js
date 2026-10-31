// Service worker del CRM: permite abrir la app sin cobertura.
// - Ficheros estáticos de Next (/_next/static, con hash): caché primero.
// - Páginas: red primero; sin red se sirve "Nueva visita", que no contiene
//   datos del usuario (los lee de IndexedDB en el propio móvil).
// - Reparto: "/reparto" también se guarda; si el conductor tiene una ruta
//   en marcha, sin red se le lleva ahí en vez de a "Nueva visita".
// Nunca se cachean páginas con datos ni llamadas a Supabase.

const VERSION = "v1";
const CACHE_PAGINA = `pagina-${VERSION}`;
const CACHE_ESTATICOS = "estaticos";
const PAGINA_OFFLINE = "/visita/nueva";
const PAGINA_REPARTO = "/reparto";
const PREFERENCIA = "/__preferencia-sin-red";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n.startsWith("pagina-") && n !== CACHE_PAGINA).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Guarda una página sin datos del usuario y todos los JS/CSS que necesita. Solo con sesión iniciada. */
async function cachearPagina(ruta) {
  const respuesta = await fetch(ruta, { credentials: "same-origin", cache: "no-store" });
  if (!respuesta.ok || respuesta.redirected) return; // sin sesión → redirige al login
  const html = await respuesta.clone().text();
  const recursos = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  const estaticos = await caches.open(CACHE_ESTATICOS);
  await Promise.all(recursos.map((url) => estaticos.match(url).then((hit) => hit ?? estaticos.add(url)).catch(() => {})));
  await (await caches.open(CACHE_PAGINA)).put(ruta, respuesta);
}

async function cachearPaginaOffline() {
  await cachearPagina(PAGINA_OFFLINE);
  await cachearPagina(PAGINA_REPARTO).catch(() => {});
}

async function prefiereReparto() {
  const r = await caches.match(PREFERENCIA, { cacheName: CACHE_PAGINA });
  return r ? (await r.text()) === "reparto" : false;
}

self.addEventListener("message", (event) => {
  if (event.data === "cachear-offline") event.waitUntil(cachearPaginaOffline().catch(() => {}));
  if (event.data === "borrar-cache") event.waitUntil(caches.delete(CACHE_PAGINA));
  if (event.data === "preferir-reparto" || event.data === "preferir-visita") {
    const valor = event.data === "preferir-reparto" ? "reparto" : "visita";
    event.waitUntil(caches.open(CACHE_PAGINA).then((c) => c.put(PREFERENCIA, new Response(valor))));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg") {
    event.respondWith(
      caches.open(CACHE_ESTATICOS).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const resp = await fetch(request);
        if (resp.ok) cache.put(request, resp.clone());
        return resp;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        // Reparto: su propia página, o ahí directamente si hay una ruta en marcha
        const reparto = await caches.match(PAGINA_REPARTO, { cacheName: CACHE_PAGINA });
        if (reparto && url.pathname === PAGINA_REPARTO) return reparto;
        if (reparto && url.pathname !== PAGINA_OFFLINE && (await prefiereReparto())) return Response.redirect(PAGINA_REPARTO, 302);
        const pagina = await caches.match(PAGINA_OFFLINE, { cacheName: CACHE_PAGINA });
        // Otra página sin red: llevar a "Nueva visita" (con su URL real, para que Next hidrate bien)
        if (pagina && url.pathname !== PAGINA_OFFLINE) return Response.redirect(PAGINA_OFFLINE, 302);
        return (
          pagina ??
          new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sin cobertura</title>' +
              '<body style="font-family:system-ui;padding:2rem;text-align:center"><h1>Sin cobertura</h1>' +
              "<p>Abre la app una vez con conexión para poder usarla sin cobertura.</p></body>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          )
        );
      }),
    );
  }
});

// ---------- Avisos en el móvil (push) ----------
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { cuerpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.titulo || "dliverygo", {
      body: d.cuerpo || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.etiqueta || undefined,
      data: { url: d.url || "/hoy" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/hoy", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const v of ventanas) {
        if ("focus" in v) {
          await v.focus();
          if ("navigate" in v) await v.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
