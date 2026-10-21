import type { EstadoCliente, TipoNegocio } from "./tipos";
import { normalizarTelefono, normalizarTexto } from "./visita";

/** Campos que se pueden importar, con los encabezados habituales que los identifican. */
export const CAMPOS_IMPORTACION = {
  nombre_negocio: { texto: "Nombre del negocio", sinonimos: ["nombre", "negocio", "nombre negocio", "establecimiento", "local", "razon social", "cliente", "nombre comercial", "bar"] },
  tipo: { texto: "Tipo", sinonimos: ["tipo", "tipo negocio", "categoria", "tipologia", "canal"] },
  contacto_nombre: { texto: "Persona de contacto", sinonimos: ["contacto", "persona contacto", "persona de contacto", "responsable", "encargado", "dueno", "nombre contacto"] },
  contacto_cargo: { texto: "Cargo", sinonimos: ["cargo", "puesto"] },
  telefono: { texto: "Teléfono", sinonimos: ["telefono", "tel", "tlf", "movil", "celular", "whatsapp", "telefono movil"] },
  email: { texto: "Email", sinonimos: ["email", "e-mail", "correo", "mail", "correo electronico"] },
  direccion: { texto: "Dirección", sinonimos: ["direccion", "domicilio", "calle", "dir"] },
  localidad: { texto: "Localidad", sinonimos: ["localidad", "ciudad", "poblacion", "municipio"] },
  codigo_postal: { texto: "Código postal", sinonimos: ["codigo postal", "cp", "c.p.", "postal"] },
  zona: { texto: "Zona / barrio", sinonimos: ["zona", "barrio", "distrito", "area", "ruta"] },
  estado: { texto: "Estado", sinonimos: ["estado", "situacion", "fase"] },
  proveedor_actual: { texto: "Proveedor actual", sinonimos: ["proveedor", "proveedor actual", "distribuidor", "competencia"] },
  volumen_estimado_eur: { texto: "Volumen €/mes", sinonimos: ["volumen", "volumen estimado", "consumo", "facturacion", "€/mes", "potencial"] },
  horario_visita: { texto: "Horario de visita", sinonimos: ["horario", "horario visita", "hora visita", "mejor hora"] },
  etiquetas: { texto: "Etiquetas", sinonimos: ["etiquetas", "tags"] },
  notas: { texto: "Notas", sinonimos: ["notas", "observaciones", "comentarios", "nota"] },
  consiente_whatsapp: { texto: "Acepta WhatsApp (sí/no)", sinonimos: ["acepta whatsapp", "consentimiento whatsapp", "rgpd whatsapp", "consiente whatsapp"] },
  consiente_email: { texto: "Acepta email (sí/no)", sinonimos: ["acepta email", "consentimiento email", "rgpd email", "consiente email", "acepta correo"] },
} as const;

export type CampoImportacion = keyof typeof CAMPOS_IMPORTACION;
export type Mapeo = (CampoImportacion | null)[];

const limpiar = (s: string) => normalizarTexto(s).replace(/[_\-./]+/g, " ").replace(/\s+/g, " ").trim();

/** Adivina a qué campo corresponde cada columna. Cada campo se asigna como mucho una vez. */
export function adivinarMapeo(encabezados: string[]): Mapeo {
  const usados = new Set<CampoImportacion>();
  return encabezados.map((h) => {
    const e = limpiar(String(h ?? ""));
    if (!e) return null;
    const campos = Object.entries(CAMPOS_IMPORTACION) as [CampoImportacion, (typeof CAMPOS_IMPORTACION)[CampoImportacion]][];
    // Primero coincidencia exacta, después «contiene»
    const exacto = campos.find(([k, v]) => !usados.has(k) && (v.sinonimos as readonly string[]).some((s) => limpiar(s) === e));
    const parcial = exacto ?? campos.find(([k, v]) => !usados.has(k) && (v.sinonimos as readonly string[]).some((s) => limpiar(s).length > 3 && e.includes(limpiar(s))));
    if (!parcial) return null;
    usados.add(parcial[0]);
    return parcial[0];
  });
}

const TIPOS: [RegExp, TipoNegocio][] = [
  [/cafeter|cafe\b|churrer|panader|pasteler/, "cafeteria"],
  [/restaur|meson|asador|gastrobar|marisquer|pizzer|taberna con cocina/, "restaurante"],
  [/hotel|hostal|pension|apartament/, "hotel"],
  [/pub|discotec|cocteler|copas|club/, "pub"],
  [/catering|eventos|banquete/, "catering"],
  [/bar|taberna|cervecer|vermut|bodega/, "bar"],
];

export function interpretarTipo(v: unknown): TipoNegocio {
  const t = normalizarTexto(String(v ?? ""));
  if (!t) return "bar";
  return TIPOS.find(([re]) => re.test(t))?.[1] ?? "otro";
}

export function interpretarEstado(v: unknown): EstadoCliente {
  const t = normalizarTexto(String(v ?? ""));
  if (/perdid|baja|cerrad|no interes/.test(t)) return "perdido";
  if (/client|activ|compra/.test(t)) return "cliente";
  if (/interes|oferta|negoci/.test(t)) return "interesado";
  return "prospecto";
}

export function interpretarSiNo(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  return /^(si|sí|s|yes|y|x|1|true|verdadero|ok)$/i.test(String(v ?? "").trim());
}

/** "1.200,50 €" → 1200.5 ; "1200.5" → 1200.5 ; vacío → null */
export function interpretarImporte(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").replace(/[€\s]/g, "");
  if (!s) return null;
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.200,50
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // 1.500 = mil quinientos
  else s = s.replace(/,/g, ""); // 1,200 o 1200.5
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface FilaImportada {
  nombre_negocio: string;
  tipo: TipoNegocio;
  estado: EstadoCliente;
  contacto_nombre: string | null;
  contacto_cargo: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  localidad: string | null;
  codigo_postal: string | null;
  zona: string | null;
  proveedor_actual: string | null;
  volumen_estimado_eur: number | null;
  horario_visita: string | null;
  etiquetas: string[];
  notas: string | null;
  consiente_whatsapp: boolean;
  consiente_email: boolean;
}

export interface ResultadoFila {
  fila: number; // número de fila en el fichero (1 = encabezados)
  datos: FilaImportada | null;
  error?: string;
  aviso?: string;
}

const texto = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim();
  return s ? s : null;
};

export function convertirFilas(filas: unknown[][], mapeo: Mapeo): ResultadoFila[] {
  return filas.map((celdas, i) => {
    const v = (campo: CampoImportacion) => {
      const idx = mapeo.indexOf(campo);
      return idx >= 0 ? celdas[idx] : undefined;
    };
    const nombre = texto(v("nombre_negocio"));
    if (!nombre) return { fila: i + 2, datos: null, error: "Sin nombre del negocio" };

    const avisos: string[] = [];
    const telBruto = texto(v("telefono"));
    const telefono = telBruto ? (normalizarTelefono(telBruto) ?? telBruto) : null;
    if (telBruto && !normalizarTelefono(telBruto)) avisos.push("teléfono raro");
    const emailBruto = texto(v("email"));
    const email = emailBruto && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBruto) ? emailBruto.toLowerCase() : null;
    if (emailBruto && !email) avisos.push("email no válido (se omite)");
    const cp = texto(v("codigo_postal"));

    return {
      fila: i + 2,
      aviso: avisos.join(", ") || undefined,
      datos: {
        nombre_negocio: nombre,
        tipo: interpretarTipo(v("tipo") ?? nombre),
        estado: interpretarEstado(v("estado")),
        contacto_nombre: texto(v("contacto_nombre")),
        contacto_cargo: texto(v("contacto_cargo")),
        telefono,
        email,
        direccion: texto(v("direccion")),
        localidad: texto(v("localidad")),
        // Excel guarda 08001 como 8001
        codigo_postal: cp && /^\d{4}$/.test(cp) ? "0" + cp : cp,
        zona: texto(v("zona")),
        proveedor_actual: texto(v("proveedor_actual")),
        volumen_estimado_eur: interpretarImporte(v("volumen_estimado_eur")),
        horario_visita: texto(v("horario_visita")),
        etiquetas: (texto(v("etiquetas")) ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        notas: texto(v("notas")),
        consiente_whatsapp: interpretarSiNo(v("consiente_whatsapp")),
        consiente_email: interpretarSiNo(v("consiente_email")),
      },
    };
  });
}

/** Clave para detectar duplicados: teléfono normalizado o nombre sin tildes ni signos. */
export function claveDuplicado(c: { nombre_negocio: string; telefono: string | null }): string[] {
  const claves = [`n:${normalizarTexto(c.nombre_negocio).replace(/[^a-z0-9]/g, "")}`];
  const tel = c.telefono ? normalizarTelefono(c.telefono) : null;
  if (tel) claves.push(`t:${tel}`);
  return claves;
}
