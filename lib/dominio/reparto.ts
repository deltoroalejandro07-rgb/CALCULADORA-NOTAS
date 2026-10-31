// Reglas del reparto (logística L1-L2). Puras y testeadas: las usan la oficina y la app del conductor.

export type EstadoRuta = "planificada" | "en_curso" | "terminada";
export type EstadoParada = "pendiente" | "entregada" | "fallida";

export const TEXTO_ESTADO_RUTA: Record<EstadoRuta, string> = {
  planificada: "Planificada",
  en_curso: "En reparto",
  terminada: "Terminada",
};

export const TEXTO_ESTADO_PARADA: Record<EstadoParada, string> = {
  pendiente: "Pendiente",
  entregada: "Entregada",
  fallida: "No entregada",
};

export const MOTIVOS_FALLO = ["Cerrado", "No quiere el pedido", "Falta producto", "No encuentro la dirección", "Sin acceso para el camión", "Otro"] as const;

export const FORMAS_COBRO = ["Efectivo", "Tarjeta", "Bizum", "Transferencia"] as const;

export const ETIQUETAS_AMBIENTALES = ["0", "ECO", "C", "B", "sin"] as const;
export const TEXTO_ETIQUETA: Record<(typeof ETIQUETAS_AMBIENTALES)[number], string> = {
  "0": "Cero emisiones",
  ECO: "ECO",
  C: "C (verde)",
  B: "B (amarilla)",
  sin: "Sin etiqueta",
};

/** Lo que devuelve mi_reparto() para cada ruta del conductor. */
export interface RutaReparto {
  id: string;
  fecha: string;
  estado: EstadoRuta;
  notas: string | null;
  vehiculo: { nombre: string; matricula: string | null } | null;
  almacen: { direccion: string | null; lat: number | null; lng: number | null } | null;
  paradas: ParadaReparto[];
}

export interface ParadaReparto {
  id: string;
  orden: number;
  estado: EstadoParada;
  entrega_id: string | null;
  realizada_at: string | null;
  notas_oficina: string | null;
  pedido_id: string | null;
  /** Hora calculada por el optimizador (HH:MM) y nº de albarán de Holded, si los hay. */
  llegada_prevista?: string | null;
  albaran?: string | null;
  cliente: {
    id: string;
    nombre: string;
    direccion: string | null;
    localidad: string | null;
    telefono: string | null;
    contacto: string | null;
    lat: number | null;
    lng: number | null;
    horario_entrega: string | null;
    notas_acceso: string | null;
  };
  lineas: { producto_id: string | null; descripcion: string; cantidad: number }[];
}

export interface LineaEntrega {
  producto_id: string | null;
  descripcion: string;
  pedida: number;
  entregada: number;
}

/** Al abrir la entrega, todo viene marcado como entregado: solo se toca lo que falte. */
export function lineasIniciales(lineas: ParadaReparto["lineas"]): LineaEntrega[] {
  return lineas.map((l) => ({ producto_id: l.producto_id, descripcion: l.descripcion, pedida: Number(l.cantidad), entregada: Number(l.cantidad) }));
}

export function esEntregaParcial(lineas: LineaEntrega[]): boolean {
  return lineas.some((l) => l.entregada < l.pedida);
}

export function cambiarCantidad(lineas: LineaEntrega[], i: number, delta: number): LineaEntrega[] {
  return lineas.map((l, j) => (j === i ? { ...l, entregada: Math.max(0, Math.round((l.entregada + delta) * 100) / 100) } : l));
}

export interface DatosEntrega {
  estado: "entregada" | "fallida";
  motivo_fallo?: string | null;
  cobrado?: number | null;
  forma_cobro?: string | null;
}

/**
 * Qué falta para poder guardar. La firma va en el albarán de papel de Holded, así que una
 * entrega no la pide; un fallo necesita el motivo y un cobro, cómo ha pagado.
 */
export function validarEntrega(d: DatosEntrega): string | null {
  if (d.estado === "fallida") return d.motivo_fallo?.trim() ? null : "Elige el motivo.";
  if (d.cobrado != null) {
    if (!Number.isFinite(d.cobrado) || d.cobrado < 0) return "El importe cobrado no es válido.";
    if (d.cobrado > 0 && !d.forma_cobro) return "Indica cómo ha pagado.";
  }
  return null;
}

/** «12,50» o «12.50» → 12.5. Vacío → null. */
export function leerImporte(texto: string): number | null {
  const t = texto.trim().replace(/\s|€/g, "");
  if (!t) return null;
  const n = Number(t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Siguiente parada por hacer, mirando también lo ya hecho en el móvil y aún no subido. */
export function siguienteParada<T extends { id: string; orden: number; estado: EstadoParada }>(paradas: T[], hechasEnMovil: Set<string> = new Set()): T | null {
  return [...paradas].sort((a, b) => a.orden - b.orden).find((p) => p.estado === "pendiente" && !hechasEnMovil.has(p.id)) ?? null;
}

export function progreso<T extends { id: string; estado: EstadoParada }>(paradas: T[], hechasEnMovil: Set<string> = new Set()) {
  const hechas = paradas.filter((p) => p.estado !== "pendiente" || hechasEnMovil.has(p.id)).length;
  return { hechas, total: paradas.length };
}

export interface LineaCarga {
  clave: string;
  descripcion: string;
  cantidad: number;
}

/** Total de cada producto que hay que cargar en el camión. */
export function totalCarga(paradas: { lineas: { producto_id: string | null; descripcion: string; cantidad: number }[] }[]): LineaCarga[] {
  const total = new Map<string, LineaCarga>();
  for (const p of paradas) {
    for (const l of p.lineas) {
      const clave = l.producto_id ?? l.descripcion.toLowerCase();
      const previa = total.get(clave);
      total.set(clave, { clave, descripcion: previa?.descripcion ?? l.descripcion, cantidad: Math.round(((previa?.cantidad ?? 0) + Number(l.cantidad)) * 100) / 100 });
    }
  }
  return [...total.values()].sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
}

/** Orden de carga: lo último que se entrega va al fondo del camión, así que se carga primero. */
export function ordenCarga<T extends { orden: number }>(paradas: T[]): T[] {
  return [...paradas].sort((a, b) => b.orden - a.orden);
}

/** Mueve una parada arriba o abajo y renumera 1..n. */
export function moverParada<T extends { id: string; orden: number }>(paradas: T[], id: string, delta: -1 | 1): T[] {
  const lista = [...paradas].sort((a, b) => a.orden - b.orden);
  const i = lista.findIndex((p) => p.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return lista.map((p, k) => ({ ...p, orden: k + 1 }));
}

/** Dirección legible de la parada. */
export function direccionParada(c: { direccion: string | null; localidad: string | null }): string {
  return [c.direccion, c.localidad].filter(Boolean).join(", ");
}
