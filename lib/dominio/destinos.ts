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
