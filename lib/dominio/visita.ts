import type { ResultadoVisita } from "./tipos";

/** Próxima acción que se propone según el resultado (el comercial puede cambiarla). */
export const SUGERENCIA_PROXIMA: Record<ResultadoVisita, { texto: string; dias: number } | null> = {
  no_estaba: { texto: "Volver a pasar", dias: 2 },
  sin_interes: null,
  pide_info: { texto: "Enviar información", dias: 1 },
  interesado: { texto: "Seguimiento", dias: 7 },
  pide_oferta: { texto: "Preparar y enviar oferta", dias: 2 },
  hace_pedido: { texto: "Confirmar entrega", dias: 3 },
};

export const MATERIALES = ["Catálogo", "Tarifa", "Folleto de oferta", "Muestras", "Cartelería"] as const;

export const TIPOS_FOTO = ["escaparate", "barra", "competencia", "otra"] as const;
export type TipoFoto = (typeof TIPOS_FOTO)[number];
export const TEXTO_TIPO_FOTO: Record<TipoFoto, string> = {
  escaparate: "Escaparate",
  barra: "Barra",
  competencia: "Competencia",
  otra: "Otra",
};

/** Relación de un producto con la visita: un toque = presentado, dos = le interesa, tres = nada. */
export type MarcaProducto = "presentado" | "interes";

export function siguienteMarca(actual: MarcaProducto | undefined): MarcaProducto | undefined {
  if (!actual) return "presentado";
  if (actual === "presentado") return "interes";
  return undefined;
}

/** Fecha aaaa-mm-dd en Madrid sumando días a hoy. */
export function fechaDentroDe(dias: number, desde: Date = new Date()): string {
  const d = new Date(desde.getTime() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
}

/** Lunes de la semana que viene, en Madrid. */
export function proximoLunes(desde: Date = new Date()): string {
  const diaSemana = new Date(fechaDentroDe(0, desde) + "T12:00:00Z").getUTCDay(); // 0 = domingo
  const hasta = (8 - diaSemana) % 7 || 7;
  return fechaDentroDe(hasta, desde);
}

/** Distancia en metros entre dos coordenadas (haversine). */
export function distanciaMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function textoDistancia(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Normaliza un teléfono español a E.164 (+34…). Devuelve null si no parece válido. */
export function normalizarTelefono(entrada: string): string | null {
  const limpio = entrada.replace(/[\s\-().]/g, "");
  if (!limpio) return null;
  let n = limpio.startsWith("00") ? "+" + limpio.slice(2) : limpio;
  if (/^[6789]\d{8}$/.test(n)) n = "+34" + n;
  return /^\+\d{9,15}$/.test(n) ? n : null;
}

/** Búsqueda sin tildes ni mayúsculas. */
export function normalizarTexto(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
