import { fecha } from "../formato";

export const VARIABLES = ["contacto", "negocio", "comercial", "oferta", "productos", "fecha_fin"] as const;
export type Variable = (typeof VARIABLES)[number];

export const AYUDA_VARIABLES: Record<Variable, string> = {
  contacto: "Nombre de la persona de contacto (o el del negocio si no hay)",
  negocio: "Nombre del negocio",
  comercial: "Tu nombre",
  oferta: "Título de la oferta",
  productos: "Productos de la oferta",
  fecha_fin: "Fecha en que acaba la oferta",
};

export interface DatosMensaje {
  contacto?: string | null;
  negocio: string;
  comercial: string;
  oferta?: { titulo: string; fecha_fin: string; productos: string[] } | null;
}

export const TEXTO_BAJA_WHATSAPP = "Si no quieres recibir más mensajes, responde BAJA.";
export const TEXTO_BAJA_EMAIL = "Si no quieres recibir más emails comerciales, responde a este correo con la palabra BAJA.";

function listaNatural(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Sustituye las {variables}. Las que no tienen valor se quitan sin dejar huecos raros. */
export function rellenarPlantilla(cuerpo: string, d: DatosMensaje): string {
  const valores: Record<Variable, string> = {
    contacto: d.contacto?.trim().split(/\s+/)[0] || d.negocio,
    negocio: d.negocio,
    comercial: d.comercial,
    oferta: d.oferta?.titulo ?? "",
    productos: d.oferta ? listaNatural(d.oferta.productos) : "",
    fecha_fin: d.oferta ? fecha(d.oferta.fecha_fin) : "",
  };
  return cuerpo
    .replace(/\{(\w+)\}/g, (todo, nombre: string) => (nombre in valores ? valores[nombre as Variable] : todo))
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** LSSI: toda comunicación comercial debe ofrecer una forma sencilla de darse de baja. */
export function conBaja(texto: string, canal: "whatsapp" | "email"): string {
  if (/\bBAJA\b/.test(texto)) return texto;
  return `${texto}\n\n${canal === "whatsapp" ? TEXTO_BAJA_WHATSAPP : TEXTO_BAJA_EMAIL}`;
}

/** Variables que aparecen en la plantilla y no existen (erratas como {nombre}). */
export function variablesDesconocidas(cuerpo: string): string[] {
  return [...cuerpo.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => !(VARIABLES as readonly string[]).includes(v));
}
