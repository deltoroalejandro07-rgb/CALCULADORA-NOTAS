import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aMinutos, deMinutos, textoFranja } from "@/lib/dominio/horario";
import { optimizar, planEnOrden, type ParadaOpt } from "@/lib/dominio/optimizar";
import type { Database } from "@/lib/supabase/tipos-bd";
import { matrizDe, type FuenteMatriz } from "./mapas";

type Cliente = SupabaseClient<Database>;

export interface ParadaPropuesta {
  destinoId: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  albaranIds: string[];
  numeros: string[];
  bultos: number;
  llegada: string; // HH:MM
  ventana: string | null;
  espera: number;
  retraso: number;
}

export interface RutaPropuesta {
  vehiculoId: string;
  vehiculo: string;
  conductorId: string | null;
  paradas: ParadaPropuesta[];
  salida: string;
  vuelta: string;
  duracionMin: number;
  km: number;
  bultos: number;
  capacidad: number | null;
}

export interface PlanPropuesto {
  fecha: string;
  fuente: FuenteMatriz;
  rutas: RutaPropuesta[];
  totalMin: number;
  totalKm: number;
  /** Frente a hacer las paradas en el orden en que llegaron los albaranes, con un solo vehículo. */
  ahorroKm: number;
  ahorroMin: number;
  sinUbicacion: { albaranId: string; nombre: string }[];
  avisos: string[];
}

const redondear = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export async function calcularPlan(sb: Cliente, fecha: string, albaranIds: string[], vehiculoIds: string[]): Promise<PlanPropuesto> {
  const [{ data: aj }, { data: albaranes }, { data: vehiculos }] = await Promise.all([
    sb.from("ajustes_logistica").select("*").single(),
    sb.from("albaranes").select("id, numero, lineas, bultos, creado_at, destinos(*)").in("id", albaranIds).eq("estado", "pendiente").order("creado_at"),
    sb.from("vehiculos").select("id, nombre, matricula, capacidad_bultos, conductor_habitual").in("id", vehiculoIds).eq("activo", true).order("nombre"),
  ]);
  if (!aj || aj.almacen_lat == null || aj.almacen_lng == null) throw new Error("Primero marca dónde está el almacén (Vehículos y almacén).");
  if (!vehiculos?.length) throw new Error("Elige al menos un vehículo.");
  if (!albaranes?.length) throw new Error("No hay albaranes pendientes seleccionados.");

  const sinUbicacion = albaranes.filter((a) => a.destinos?.lat == null).map((a) => ({ albaranId: a.id, nombre: a.destinos?.nombre ?? "—" }));

  // Un mismo cliente con varios albaranes = una sola parada
  const grupos = new Map<string, { destino: NonNullable<(typeof albaranes)[number]["destinos"]>; albaranes: typeof albaranes }>();
  for (const a of albaranes) {
    if (!a.destinos || a.destinos.lat == null) continue;
    const g = grupos.get(a.destinos.id) ?? { destino: a.destinos, albaranes: [] };
    g.albaranes.push(a);
    grupos.set(a.destinos.id, g);
  }
  const lista = [...grupos.values()];
  if (!lista.length) throw new Error("Ningún albarán seleccionado tiene ubicación en el mapa.");

  const bultosDe = (a: (typeof albaranes)[number]) =>
    a.bultos ?? Math.ceil(((a.lineas as { cantidad?: number }[] | null) ?? []).reduce((s, l) => s + (Number(l.cantidad) || 0), 0));
  const paradas: ParadaOpt[] = lista.map((g) => ({
    id: g.destino.id,
    servicioMin: g.destino.minutos_descarga ?? aj.minutos_descarga,
    desde: aMinutos(g.destino.ventana_desde),
    hasta: aMinutos(g.destino.ventana_hasta),
    bultos: g.albaranes.reduce((s, a) => s + bultosDe(a), 0),
  }));
  const { matriz, fuente } = await matrizDe([{ lat: aj.almacen_lat, lng: aj.almacen_lng }, ...lista.map((g) => ({ lat: g.destino.lat!, lng: g.destino.lng! }))]);
  const op = { salidaMin: aMinutos(aj.hora_salida) ?? 480, volverAlmacen: aj.volver_almacen };
  const flota = vehiculos.map((v) => ({ id: v.id, capacidad: v.capacidad_bultos }));
  const plan = optimizar(paradas, flota, matriz, op);
  const aMano = planEnOrden(paradas, flota[0], matriz, op);

  const avisos: string[] = [];
  for (const r of plan.retrasos) {
    const g = grupos.get(r.id)!;
    avisos.push(`${g.destino.nombre}: no se llega a tiempo a su horario (${r.minutos} min tarde) ni con el mejor orden.`);
  }
  for (const s of plan.sobrecarga) {
    const v = vehiculos.find((x) => x.id === s.vehiculoId)!;
    avisos.push(`${v.nombre} lleva ${s.bultos} bultos y su capacidad es ${s.capacidad}: añade otro vehículo o revisa la carga.`);
  }
  if (sinUbicacion.length) avisos.push(`${sinUbicacion.length === 1 ? "1 albarán sin ubicación no entra" : `${sinUbicacion.length} albaranes sin ubicación no entran`} en la ruta: corrige su dirección.`);

  const rutas: RutaPropuesta[] = plan.rutas
    .map((r) => {
      const v = vehiculos.find((x) => x.id === r.vehiculoId)!;
      return {
        vehiculoId: v.id,
        vehiculo: [v.nombre, v.matricula].filter(Boolean).join(" · "),
        conductorId: v.conductor_habitual,
        salida: deMinutos(op.salidaMin),
        vuelta: deMinutos(r.fin),
        duracionMin: Math.round(r.duracionMin),
        km: redondear(r.distanciaM / 1000),
        bultos: r.bultos,
        capacidad: v.capacidad_bultos,
        paradas: r.paradas.map((p) => {
          const g = grupos.get(p.id)!;
          return {
            destinoId: p.id,
            nombre: g.destino.nombre,
            direccion: [g.destino.direccion, g.destino.localidad].filter(Boolean).join(", "),
            lat: g.destino.lat!,
            lng: g.destino.lng!,
            albaranIds: g.albaranes.map((a) => a.id),
            numeros: g.albaranes.map((a) => a.numero ?? "—"),
            bultos: g.albaranes.reduce((s, a) => s + bultosDe(a), 0),
            llegada: deMinutos(p.llegada),
            ventana: textoFranja(g.destino.ventana_desde, g.destino.ventana_hasta),
            espera: Math.round(p.espera),
            retraso: Math.round(p.retraso),
          };
        }),
      };
    })
    .filter((r) => r.paradas.length);

  return {
    fecha,
    fuente,
    rutas,
    totalMin: Math.round(plan.totalMin),
    totalKm: redondear(plan.totalM / 1000),
    ahorroKm: Math.max(0, redondear((aMano.totalM - plan.totalM) / 1000)),
    ahorroMin: Math.max(0, Math.round(aMano.totalMin - plan.totalMin)),
    sinUbicacion,
    avisos,
  };
}
