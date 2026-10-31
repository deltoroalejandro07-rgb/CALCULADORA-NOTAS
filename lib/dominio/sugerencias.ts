// «¿A quién visito hoy?» y «clientes en riesgo»: reglas claras con su motivo, sin IA.
import { TEXTO_RESULTADO, type EstadoCliente, type ResultadoVisita } from "./tipos";
import { distanciaMetros, textoDistancia } from "./visita";

export interface ClienteSugerible {
  id: string;
  nombre_negocio: string;
  estado: EstadoCliente;
  lat: number | null;
  lng: number | null;
  ultimo_resultado: ResultadoVisita | null;
  ultimo_resultado_at: string | null;
  ultima_visita_at: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  horario_visita: string | null;
}

export interface Sugerencia<T> {
  cliente: T;
  puntos: number;
  motivos: string[];
}

const DIA_MS = 86_400_000;
const diasEntre = (desde: string, hoy: string) => Math.floor((Date.parse(hoy + "T12:00:00Z") - Date.parse(desde.slice(0, 10) + "T12:00:00Z")) / DIA_MS);
const LETRAS = "LMXJVSD";
const plural = (n: number, una: string, varias: string) => (n === 1 ? `1 ${una}` : `${n} ${varias}`);

/** Días de la semana (0 = lunes) que abre según «L-V 16:00-18:00», «L,X,V», «S-D»… null si no se entiende. */
export function diasDeHorario(horario: string | null): Set<number> | null {
  const m = horario?.toUpperCase().match(/^\s*([LMXJVSD](?:\s*[-,]\s*[LMXJVSD])*)\b/);
  if (!m) return null;
  const dias = new Set<number>();
  for (const parte of m[1].replace(/\s/g, "").split(",")) {
    const [a, b] = parte.split("-").map((l) => LETRAS.indexOf(l));
    if (b === undefined) dias.add(a);
    else for (let i = a; ; i = (i + 1) % 7) {
      dias.add(i);
      if (i === b) break;
    }
  }
  return dias;
}

const diaSemana = (hoy: string) => (new Date(hoy + "T12:00:00Z").getUTCDay() + 6) % 7;

/** Los clientes con más sentido para visitar hoy, de más a menos, con el porqué. */
export function sugerirVisitas<T extends ClienteSugerible>(clientes: T[], hoy: string, pos?: { lat: number; lng: number } | null, max = 5): Sugerencia<T>[] {
  const dia = diaSemana(hoy);
  const res: Sugerencia<T>[] = [];
  for (const c of clientes) {
    if (c.estado === "perdido") continue;
    // Si según su horario hoy no recibe visitas, no se sugiere
    const abre = diasDeHorario(c.horario_visita);
    if (abre && !abre.has(dia)) continue;
    let puntos = 0;
    const motivos: { p: number; t: string }[] = [];
    const suma = (p: number, t: string) => {
      puntos += p;
      motivos.push({ p, t });
    };

    if (c.proxima_accion_fecha && c.proxima_accion_fecha < hoy) {
      const n = diasEntre(c.proxima_accion_fecha, hoy);
      suma(50 + Math.min(n, 14) * 2, `Seguimiento vencido hace ${plural(n, "día", "días")}${c.proxima_accion ? `: ${c.proxima_accion}` : ""}`);
    } else if (c.proxima_accion_fecha === hoy) {
      suma(45, `Tiene seguimiento hoy${c.proxima_accion ? `: ${c.proxima_accion}` : ""}`);
    }

    if (c.ultimo_resultado_at && (c.ultimo_resultado === "pide_oferta" || c.ultimo_resultado === "interesado" || c.ultimo_resultado === "pide_info")) {
      const n = diasEntre(c.ultimo_resultado_at, hoy);
      if (n <= 21) {
        const base = c.ultimo_resultado === "pide_oferta" ? 35 : c.ultimo_resultado === "interesado" ? 25 : 15;
        suma(base, `${TEXTO_RESULTADO[c.ultimo_resultado]} hace ${plural(n, "día", "días")}`);
      }
    }

    if (!c.ultima_visita_at) {
      if (c.estado === "prospecto") suma(12, "Aún no se ha visitado");
    } else {
      const n = diasEntre(c.ultima_visita_at, hoy);
      const limite = c.estado === "cliente" ? 45 : 30;
      if (n > limite) suma(15 + Math.min(n - limite, 60) / 3, `Lleva ${n} días sin visita`);
    }

    if (puntos <= 0) continue;

    if (pos && c.lat != null && c.lng != null) {
      const m = distanciaMetros(pos, { lat: c.lat, lng: c.lng });
      if (m < 2500) suma(m < 800 ? 10 : 6, `Te pilla cerca (${textoDistancia(m)})`);
    }

    if (puntos > 0) res.push({ cliente: c, puntos: Math.round(puntos), motivos: motivos.sort((a, b) => b.p - a.p).map((m) => m.t) });
  }
  return res.sort((a, b) => b.puntos - a.puntos).slice(0, max);
}

export interface Riesgo<T> {
  cliente: T;
  gravedad: "alta" | "media";
  motivo: string;
}

/** Clientes y oportunidades que se están enfriando y conviene mirar antes de perderlos. */
export function clientesEnRiesgo<T extends ClienteSugerible>(clientes: T[], hoy: string): Riesgo<T>[] {
  const res: Riesgo<T>[] = [];
  for (const c of clientes) {
    const sinVisita = c.ultima_visita_at ? diasEntre(c.ultima_visita_at, hoy) : null;
    const vencido = c.proxima_accion_fecha && c.proxima_accion_fecha < hoy ? diasEntre(c.proxima_accion_fecha, hoy) : 0;
    if (c.estado === "cliente") {
      if (c.ultimo_resultado === "sin_interes") res.push({ cliente: c, gravedad: "alta", motivo: "Es cliente y en la última visita dijo «sin interés»" });
      else if (sinVisita != null && sinVisita > 60) res.push({ cliente: c, gravedad: "alta", motivo: `Cliente sin visita desde hace ${sinVisita} días` });
      else if (sinVisita != null && sinVisita > 40) res.push({ cliente: c, gravedad: "media", motivo: `Cliente sin visita desde hace ${sinVisita} días` });
      else if (vencido > 7) res.push({ cliente: c, gravedad: "media", motivo: `Seguimiento vencido hace ${vencido} días` });
    } else if (c.estado === "interesado") {
      const desdeInteres = c.ultimo_resultado_at ? diasEntre(c.ultimo_resultado_at, hoy) : null;
      if (c.ultimo_resultado === "pide_oferta" && desdeInteres != null && desdeInteres > 10 && (sinVisita ?? 99) > 10)
        res.push({ cliente: c, gravedad: "alta", motivo: `Pidió oferta hace ${desdeInteres} días y nadie ha vuelto` });
      else if (vencido > 7) res.push({ cliente: c, gravedad: "alta", motivo: `Interesado con el seguimiento vencido hace ${vencido} días` });
      else if (sinVisita != null && sinVisita > 21) res.push({ cliente: c, gravedad: "media", motivo: `Interesado sin visita desde hace ${sinVisita} días: se enfría` });
    }
  }
  return res.sort((a, b) => (a.gravedad === b.gravedad ? 0 : a.gravedad === "alta" ? -1 : 1));
}
