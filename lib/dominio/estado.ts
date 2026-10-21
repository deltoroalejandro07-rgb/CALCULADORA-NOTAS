import type { EstadoCliente, ResultadoVisita } from "./tipos";

/**
 * Estado del cliente tras una visita. Es la misma regla que aplica el
 * trigger `siguiente_estado` en la base de datos; aquí sirve para enseñar
 * en pantalla qué va a pasar antes de guardar (y para trabajar sin cobertura).
 *
 * - Hace pedido → cliente.
 * - Pide oferta o interesado → interesado, si era prospecto o perdido.
 * - Resto → sin cambio. "Sin interés" no marca perdido: eso es manual.
 */
export function siguienteEstado(actual: EstadoCliente, resultado: ResultadoVisita): EstadoCliente {
  if (resultado === "hace_pedido") return "cliente";
  if ((resultado === "pide_oferta" || resultado === "interesado") && (actual === "prospecto" || actual === "perdido")) {
    return "interesado";
  }
  return actual;
}
