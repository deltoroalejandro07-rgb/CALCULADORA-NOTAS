// Previsión de pedidos: cada cuántos días suele pedir cada cliente (por sus albaranes) y a quién le toca ya.

export interface PedidoPasado {
  destinoId: string;
  fecha: string; // YYYY-MM-DD
}

export interface Prevision {
  destinoId: string;
  cadaDias: number; // intervalo típico entre pedidos
  ultimo: string;
  diasDesdeUltimo: number;
  pedidos: number;
  /** «toca»: ya debería haber pedido; «pronto»: le toca en 1-2 días. */
  estado: "toca" | "pronto";
  retrasoDias: number;
}

const DIA = 86_400_000;
const dias = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / DIA);
const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

/**
 * Necesita al menos 3 pedidos (2 intervalos). Usa la mediana para que un pedido suelto no despiste.
 * Deja de avisar si lleva más de 4 veces su ritmo sin pedir (probablemente ya no es cliente habitual).
 */
export function preverPedidos(pedidos: PedidoPasado[], hoy: string): Prevision[] {
  const porDestino = new Map<string, string[]>();
  for (const p of pedidos) {
    const l = porDestino.get(p.destinoId) ?? [];
    l.push(p.fecha.slice(0, 10));
    porDestino.set(p.destinoId, l);
  }
  const res: Prevision[] = [];
  for (const [destinoId, fechas] of porDestino) {
    const unicas = [...new Set(fechas)].sort();
    if (unicas.length < 3) continue;
    const intervalos = unicas.slice(1).map((f, i) => dias(unicas[i], f)).filter((d) => d > 0);
    if (intervalos.length < 2) continue;
    const cada = Math.max(1, Math.round(mediana(intervalos)));
    const ultimo = unicas.at(-1)!;
    const desde = dias(ultimo, hoy);
    if (desde > cada * 4) continue;
    const margen = Math.max(1, Math.round(cada * 0.15));
    const retraso = desde - cada;
    if (retraso >= margen) res.push({ destinoId, cadaDias: cada, ultimo, diasDesdeUltimo: desde, pedidos: unicas.length, estado: "toca", retrasoDias: retraso });
    else if (retraso >= -2) res.push({ destinoId, cadaDias: cada, ultimo, diasDesdeUltimo: desde, pedidos: unicas.length, estado: "pronto", retrasoDias: retraso });
  }
  return res.sort((a, b) => (a.estado === b.estado ? b.retrasoDias - a.retrasoDias : a.estado === "toca" ? -1 : 1));
}

/** Mensaje de WhatsApp para avisar al cliente de la hora de llegada. */
export function mensajeLlegada(empresa: string, hora: string | null, ahora: Date = new Date()): string {
  const hhmm = ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  if (hora && hora > hhmm) return `Hola, somos ${empresa} 🚚. Hoy te llevamos tu pedido: llegaremos sobre las ${hora}. ¡Gracias!`;
  return `Hola, somos ${empresa} 🚚. Vamos de camino con tu pedido: llegamos en unos minutos. ¡Gracias!`;
}
