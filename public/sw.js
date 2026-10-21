// Service worker del CRM: permite abrir la app sin cobertura.
// - Ficheros estáticos de Next (/_next/static, con hash): caché primero.
// - Páginas: red primero; sin red se sirve "Nueva visita", que no contiene
//   datos del usuario (los lee de IndexedDB en el propio móvil).
// Nunca se cachean páginas con datos ni llamadas a Supabase.

const VERSION = "v1";
const CACHE_PAGINA = `pagina-${VERSION}`;
const CACHE_ESTATICOS = "estaticos";
const PAGINA_OFFLINE = "/visita/nueva";

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

/** Guarda la página offline y todos los JS/CSS que necesita. Solo con sesión iniciada. */
async function cachearPaginaOffline() {
  const respuesta = await fetch(PAGINA_OFFLINE, { credentials: "same-origin", cache: "no-store" });
  if (!respuesta.ok || respuesta.redirected) return; // sin sesión → redirige al login
  const html = await respuesta.clone().text();
  const recursos = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  const estaticos = await caches.open(CACHE_ESTATICOS);
  await Promise.all(recursos.map((url) => estaticos.match(url).then((hit) => hit ?? estaticos.add(url)).catch(() => {})));
  await (await caches.open(CACHE_PAGINA)).put(PAGINA_OFFLINE, respuesta);
}

self.addEventListener("message", (event) => {
  if (event.data === "cachear-offline") event.waitUntil(cachearPaginaOffline().catch(() => {}));
  if (event.data === "borrar-cache") event.waitUntil(caches.delete(CACHE_PAGINA));
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
