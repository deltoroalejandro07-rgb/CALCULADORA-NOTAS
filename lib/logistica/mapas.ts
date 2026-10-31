import "server-only";
import { variantesDireccion } from "@/lib/dominio/destinos";
import { matrizEstimada, type Matriz, type Punto } from "@/lib/dominio/optimizar";

// Mapas y distancias. Con OPENROUTESERVICE_API_KEY (gratis en openrouteservice.org) se usan
// tiempos reales por carretera con perfil de camión; sin ella, una estimación. Nunca falla:
// si el servicio no responde, se calcula con la estimación.

const ORS = "https://api.openrouteservice.org";
const clave = () => process.env.OPENROUTESERVICE_API_KEY || null;

export type FuenteMatriz = "carretera" | "estimada";

export async function matrizDe(puntos: Punto[]): Promise<{ matriz: Matriz; fuente: FuenteMatriz }> {
  const estimada = matrizEstimada(puntos);
  const k = clave();
  if (!k || puntos.length < 2) return { matriz: estimada, fuente: "estimada" };
  try {
    const r = await fetch(`${ORS}/v2/matrix/driving-hgv`, {
      method: "POST",
      headers: { Authorization: k, "Content-Type": "application/json" },
      body: JSON.stringify({ locations: puntos.map((p) => [p.lng, p.lat]), metrics: ["duration", "distance"], units: "m" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return { matriz: estimada, fuente: "estimada" };
    const j = (await r.json()) as { durations?: (number | null)[][]; distances?: (number | null)[][] };
    if (!j.durations || !j.distances) return { matriz: estimada, fuente: "estimada" };
    // Algún tramo sin ruta (p. ej. una dirección mal situada): se rellena con la estimación
    const dur = j.durations.map((fila, i) => fila.map((v, jj) => (v == null ? estimada.dur[i][jj] : v + (i === jj ? 0 : 60))));
    const dist = j.distances.map((fila, i) => fila.map((v, jj) => (v == null ? estimada.dist[i][jj] : v)));
    return { matriz: { dur, dist }, fuente: "carretera" };
  } catch {
    return { matriz: estimada, fuente: "estimada" };
  }
}

// Provincia de Valencia: las búsquedas se limitan a ella (operáis en toda Valencia)
const VALENCIA = { minLon: -1.53, minLat: 38.68, maxLon: 0.08, maxLat: 40.22 };

// El buscador gratuito (Nominatim) admite una búsqueda por segundo: se espera entre una y otra
let ultimaNominatim = 0;
async function turnoNominatim() {
  const espera = ultimaNominatim + 1100 - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultimaNominatim = Date.now();
}

/** Sitúa un texto de dirección en el mapa, dentro de la provincia de Valencia. Sin resultado o sin red: null. */
export async function geocodificar(direccion: string): Promise<Punto | null> {
  const k = clave();
  try {
    if (k) {
      const q = new URLSearchParams({
        api_key: k,
        text: direccion,
        "boundary.country": "ES",
        "boundary.rect.min_lon": String(VALENCIA.minLon),
        "boundary.rect.min_lat": String(VALENCIA.minLat),
        "boundary.rect.max_lon": String(VALENCIA.maxLon),
        "boundary.rect.max_lat": String(VALENCIA.maxLat),
        layers: "address,street,venue",
        size: "1",
      });
      const r = await fetch(`${ORS}/geocode/search?${q}`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const j = (await r.json()) as { features?: { geometry: { coordinates: [number, number] } }[] };
        const c = j.features?.[0]?.geometry.coordinates;
        if (c) return { lng: c[0], lat: c[1] };
      }
    }
    await turnoNominatim();
    const q = new URLSearchParams({
      q: direccion,
      format: "json",
      limit: "1",
      countrycodes: "es",
      viewbox: `${VALENCIA.minLon},${VALENCIA.maxLat},${VALENCIA.maxLon},${VALENCIA.minLat}`,
      bounded: "1",
    });
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
      headers: { "User-Agent": "crm-dliverygo/1.0 (+https://crm-comercial-mu.vercel.app)", "Accept-Language": "es" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const [primero] = (await r.json()) as { lat: string; lon: string }[];
    return primero ? { lat: Number(primero.lat), lng: Number(primero.lon) } : null;
  } catch {
    return null;
  }
}

/** Prueba varias formas de la dirección (limpia, sin tipo de vía…) hasta encontrarla. */
export async function ubicarDireccion(d: { direccion: string | null; codigo_postal: string | null; localidad: string | null }): Promise<Punto | null> {
  for (const v of variantesDireccion(d.direccion, d.codigo_postal, d.localidad)) {
    const p = await geocodificar(v);
    if (p) return p;
  }
  return null;
}
