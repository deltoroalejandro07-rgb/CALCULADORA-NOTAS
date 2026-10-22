import { diasNaturales } from "../formato";
import type { EstadoCliente, ResultadoVisita } from "./tipos";

export type Temperatura = "caliente" | "templado" | "frio";

export const TEXTO_TEMPERATURA: Record<Temperatura, string> = {
  caliente: "Caliente",
  templado: "Templado",
  frio: "Frío",
};

const POSITIVOS: ResultadoVisita[] = ["hace_pedido", "pide_oferta", "interesado"];

export const DIAS_CALIENTE = 14;
export const DIAS_TEMPLADO = 30;

interface DatosTemperatura {
  estado: EstadoCliente;
  /** Último resultado útil (la base de datos ya ignora "no estaba"). */
  ultimo_resultado: ResultadoVisita | null;
  ultimo_resultado_at: string | Date | null;
}

/**
 * - Caliente: pedido, oferta o interés en los últimos 14 días.
 * - Templado: eso mismo hace 15–30 días, o pidió información hace ≤ 30 días.
 * - Frío: sin interés, perdido, nunca visitado o más de 30 días sin respuesta útil.
 *
 * Los días cuentan desde el último resultado útil, no desde la última visita:
 * un "no estaba" ayer no calienta a quien pidió oferta hace 40 días.
 */
export function calcularTemperatura(c: DatosTemperatura, hoy: Date = new Date()): Temperatura {
  if (c.estado === "perdido" || !c.ultimo_resultado_at || !c.ultimo_resultado) return "frio";

  const dias = diasNaturales(c.ultimo_resultado_at, hoy);
  if (dias > DIAS_TEMPLADO) return "frio";

  if (POSITIVOS.includes(c.ultimo_resultado)) return dias <= DIAS_CALIENTE ? "caliente" : "templado";
  if (c.ultimo_resultado === "pide_info") return "templado";
  return "frio";
}
