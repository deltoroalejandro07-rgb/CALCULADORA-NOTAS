// Destinos de reparto: reconocer el mismo cliente en albaranes distintos y asignarle zona.

const normal = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bc\//g, " ")
    .replace(/\b(s\.?\s?l\.?u?|s\.?\s?a\.?|sociedad limitada|sociedad anonima|calle|avda?\.?|avenida)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Mismo nombre y misma dirección de entrega (sin tildes, mayúsculas, «S.L.», «C/»…) → mismo destino. */
export function claveDestino(nombre: string, direccion: string | null, codigoPostal: string | null): string {
  return [normal(nombre), normal(direccion), (codigoPostal ?? "").trim()].join("|");
}

/** Zona por el texto del campo «Ruta» del albarán: igual o contenido, sin tildes ni mayúsculas. */
export function elegirZona<T extends { id: string; nombre: string }>(texto: string | null | undefined, zonas: T[]): T | null {
  const t = normal(texto);
  if (!t) return null;
  return zonas.find((z) => normal(z.nombre) === t) ?? zonas.find((z) => t.includes(normal(z.nombre)) || normal(z.nombre).includes(t)) ?? null;
}

/** Productos escritos a mano, uno por línea: «2 Barril 30L», «Caja tónica x3», «Agua». */
export function leerLineasTexto(texto: string): { descripcion: string; cantidad: number }[] {
  return texto
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      let m = l.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|×|uds?\.?|unidades)?\s+(.+)$/i);
      if (m) return { descripcion: m[2].trim(), cantidad: Number(m[1].replace(",", ".")) };
      m = l.match(/^(.+?)\s*(?:x|×)\s*(\d+(?:[.,]\d+)?)$/i);
      if (m) return { descripcion: m[1].trim(), cantidad: Number(m[2].replace(",", ".")) };
      return { descripcion: l, cantidad: 1 };
    });
}

export const DIAS_SEMANA = [
  { n: 1, corto: "L", largo: "Lunes" },
  { n: 2, corto: "M", largo: "Martes" },
  { n: 3, corto: "X", largo: "Miércoles" },
  { n: 4, corto: "J", largo: "Jueves" },
  { n: 5, corto: "V", largo: "Viernes" },
  { n: 6, corto: "S", largo: "Sábado" },
  { n: 7, corto: "D", largo: "Domingo" },
] as const;

/** Día de la semana (1 = lunes … 7 = domingo) de una fecha AAAA-MM-DD. */
export function diaSemana(fecha: string): number {
  const d = new Date(fecha + "T12:00:00Z").getUTCDay();
  return d === 0 ? 7 : d;
}

const TIPOS_VIA = /^(c\/|calle|carrer|avda\.?|av\.?|avenida|avinguda|paseo|passeig|pg\.?|camino|cami|camí|plaza|plaça|pl\.?|ronda|carretera|ctra\.?|travesia|travessera|gran via)\s+(de\s+(la\s+|los\s+|las\s+|l'|el\s+)?|del\s+|d')?/i;

/** Quita lo que confunde al buscador de mapas: «- BJ 1», «OFICINA 7», «LOCAL 2», «PISO 3»… */
export function limpiarDireccion(direccion: string): string {
  return direccion
    .split(/\s+-\s+/)[0]
    .replace(/,?\s*\b(oficina|of\.|local|bajo|bj|piso|pta\.?|puerta|esc\.?|escalera|nave|planta|dcha\.?|izda\.?)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/, "")
    .trim();
}

/** Formas de escribir la dirección para buscarla, de la más precisa a la más flexible. */
export function variantesDireccion(direccion: string | null, codigoPostal: string | null, localidad: string | null): string[] {
  const loc = localidad?.trim() || "Valencia";
  if (!direccion?.trim()) return [];
  const limpia = limpiarDireccion(direccion);
  const sinTipo = limpia.replace(TIPOS_VIA, "").trim();
  const v = [
    [limpia, [codigoPostal, loc].filter(Boolean).join(" "), "España"].join(", "),
    [limpia, loc, "Valencia", "España"].join(", "),
    sinTipo !== limpia ? [sinTipo, codigoPostal, loc].filter(Boolean).join(", ") : null,
  ];
  return [...new Set(v.filter((x): x is string => !!x))];
}

/**
 * Coordenadas pegadas a mano: «39.4699, -0.3763» o un enlace de Google Maps
 * (…/@39.4699,-0.3763,17z… · ?q=39.46,-0.37 · !3d39.46!4d-0.37).
 */
export function leerCoordenadas(texto: string): { lat: number; lng: number } | null {
  const t = texto.trim();
  const m =
    t.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ??
    t.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ??
    t.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i) ??
    t.match(/^(-?\d{1,2}(?:[.,]\d+)?)[,;\s]+(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1].replace(",", "."));
  const lng = Number(m[2].replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
