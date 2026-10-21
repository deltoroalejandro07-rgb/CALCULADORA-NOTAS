import type { EstadoCliente, TipoNegocio } from "./tipos";

export interface SegmentoOferta {
  fecha_inicio: string; // aaaa-mm-dd
  fecha_fin: string;
  activa: boolean;
  segmento_tipos: TipoNegocio[];
  segmento_zonas: string[];
  segmento_estados: EstadoCliente[];
  segmento_productos: string[];
}

export interface PerfilCliente {
  tipo: TipoNegocio;
  zona: string | null;
  estado: EstadoCliente;
  /** IDs de los productos que le interesan. */
  intereses: string[];
}

const igualSinTildes = (a: string, b: string) =>
  a.localeCompare(b, "es", { sensitivity: "base" }) === 0;

/**
 * ¿La oferta va dirigida a este cliente? Cada criterio vacío significa "todos".
 * Productos: basta con que le interese uno de los de la oferta.
 */
export function ofertaEncaja(o: SegmentoOferta, c: PerfilCliente, hoy: string): boolean {
  if (!o.activa || hoy < o.fecha_inicio || hoy > o.fecha_fin) return false;
  if (o.segmento_tipos.length && !o.segmento_tipos.includes(c.tipo)) return false;
  if (o.segmento_zonas.length && !(c.zona && o.segmento_zonas.some((z) => igualSinTildes(z, c.zona!)))) return false;
  if (o.segmento_estados.length && !o.segmento_estados.includes(c.estado)) return false;
  if (o.segmento_productos.length && !o.segmento_productos.some((p) => c.intereses.includes(p))) return false;
  return true;
}
