"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, Clock, Leaf, MapPinOff, Route, Sparkles, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { aceptarPlan, calcularPlanAccion } from "@/app/(app)/logistica/acciones-planificar";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { DIAS_SEMANA } from "@/lib/dominio/destinos";
import { totalCarga } from "@/lib/dominio/reparto";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { fecha as formatoFecha } from "@/lib/formato";
import type { PlanPropuesto } from "@/lib/logistica/planificar";

const COLORES = ["#2f7d77", "#dc4f40", "#2a78d6", "#eda100"];
const duracion = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`);
const sumarDias = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

interface Props {
  fecha: string;
  dia: number;
  zonas: { id: string; nombre: string; dias: number[]; vehiculo_id: string | null }[];
  albaranes: { id: string; numero: string | null; nombre: string; localidad: string | null; zonaId: string | null; ubicado: boolean; lineas: { descripcion: string; cantidad: number }[] }[];
  vehiculos: { id: string; nombre: string; matricula: string | null; capacidad_bultos: number | null; conductor_habitual: string | null }[];
  conductores: { id: string; nombre: string }[];
  almacen: { lat: number; lng: number } | null;
}

/** Suma de cada producto de los albaranes: lo que hay que cargar en el almacén. */
function HojaCarga({ albaranes, titulo }: { albaranes: Props["albaranes"]; titulo: string }) {
  const total = totalCarga(albaranes.map((a) => ({ lineas: a.lineas.map((l) => ({ producto_id: null, ...l })) })));
  return (
    <Tarjeta>
      <p className="flex items-center gap-2 font-semibold">
        <ClipboardList className="h-5 w-5 text-marca" aria-hidden /> {titulo}
      </p>
      {total.length ? (
        <table className="mt-2 w-full text-sm">
          <tbody className="divide-y divide-borde">
            {total.map((l) => (
              <tr key={l.clave}>
                <td className="py-1.5 pr-2">{l.descripcion}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{l.cantidad.toLocaleString("es-ES")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-1 text-sm text-suave">Sin productos en los albaranes elegidos.</p>
      )}
    </Tarjeta>
  );
}

export function Planificador({ fecha, dia, zonas, albaranes, vehiculos, conductores, almacen }: Props) {
  const zonasDelDia = zonas.filter((z) => z.dias.includes(dia)).map((z) => z.id);
  const [zonasSel, setZonasSel] = useState<string[]>(zonasDelDia);
  const [quitados, setQuitados] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState<Set<string>>(new Set());
  const vehiculosZonas = zonas.filter((z) => zonasDelDia.includes(z.id) && z.vehiculo_id).map((z) => z.vehiculo_id!);
  const [vehiculosSel, setVehiculosSel] = useState<string[]>(vehiculosZonas.length ? [...new Set(vehiculosZonas)] : vehiculos.slice(0, 1).map((v) => v.id));
  const [plan, setPlan] = useState<PlanPropuesto | null>(null);
  const [conductorDe, setConductorDe] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [calculando, iniciarCalculo] = useTransition();
  const [aceptando, iniciarAceptar] = useTransition();

  const seleccionados = useMemo(
    () => albaranes.filter((a) => ((a.zonaId && zonasSel.includes(a.zonaId)) || extra.has(a.id)) && !quitados.has(a.id)),
    [albaranes, zonasSel, extra, quitados],
  );
  const fuera = albaranes.filter((a) => !seleccionados.includes(a));

  function calcular() {
    setError(null);
    setPlan(null);
    iniciarCalculo(async () => {
      const r = await calcularPlanAccion(fecha, seleccionados.map((a) => a.id), vehiculosSel);
      if (r.error) setError(r.error);
      else if (r.plan) {
        setPlan(r.plan);
        setConductorDe(Object.fromEntries(r.plan.rutas.map((x) => [x.vehiculoId, x.conductorId ?? ""])));
      }
    });
  }

  function aceptar() {
    if (!plan) return;
    setError(null);
    iniciarAceptar(async () => {
      const r = await aceptarPlan(plan, conductorDe);
      if (r?.error) setError(r.error);
    });
  }

  const alternar = (set: Set<string>, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  };

  return (
    <div className="space-y-4 px-4 pb-8">
      <div className="flex items-center justify-between rounded-xl border border-borde bg-superficie p-2">
        <Link href={`/logistica/planificar?fecha=${sumarDias(fecha, -1)}`} aria-label="Día anterior" className="rounded-lg p-3 active:bg-fondo">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="font-semibold">
            {DIAS_SEMANA[dia - 1].largo} {formatoFecha(fecha)}
          </p>
          <p className="text-xs text-suave">{fecha === fechaDentroDe(0) ? "Hoy" : fecha === fechaDentroDe(1) ? "Mañana" : ""}</p>
        </div>
        <Link href={`/logistica/planificar?fecha=${sumarDias(fecha, 1)}`} aria-label="Día siguiente" className="rounded-lg p-3 active:bg-fondo">
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {!almacen && (
        <Tarjeta className="border-amber-300 bg-amber-50 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          Falta marcar el almacén (punto de salida).{" "}
          <Link href="/logistica/vehiculos" className="font-medium text-marca underline">
            Ir a vehículos y almacén
          </Link>
        </Tarjeta>
      )}

      {!plan && (
        <>
          <Tarjeta>
            <p className="font-semibold">Zonas</p>
            {zonas.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {zonas.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    aria-pressed={zonasSel.includes(z.id)}
                    onClick={() => setZonasSel((x) => (x.includes(z.id) ? x.filter((y) => y !== z.id) : [...x, z.id]))}
                    className={cn("min-h-11 rounded-full border px-4 text-sm font-medium", zonasSel.includes(z.id) ? "border-marca bg-marca-suave" : "border-borde")}
                  >
                    {z.nombre}
                    {z.dias.includes(dia) && <span className="ml-1 text-xs text-marca">· hoy toca</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-suave">
                Aún no hay zonas.{" "}
                <Link href="/logistica/zonas" className="text-marca underline">
                  Crea tus zonas y días
                </Link>{" "}
                o elige albaranes sueltos abajo.
              </p>
            )}
          </Tarjeta>

          <Tarjeta>
            <p className="font-semibold">Entregas ({seleccionados.length})</p>
            {seleccionados.length ? (
              <ul className="mt-2 divide-y divide-borde text-sm">
                {seleccionados.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 py-2">
                    <input type="checkbox" checked onChange={() => (extra.has(a.id) ? setExtra((s) => alternar(s, a.id)) : setQuitados((s) => alternar(s, a.id)))} className="h-5 w-5 accent-[var(--marca)]" aria-label={`Quitar ${a.nombre}`} />
                    <span className="min-w-0 flex-1 truncate">
                      {a.nombre}
                      <span className="text-suave"> · {a.localidad ?? ""}</span>
                    </span>
                    {!a.ubicado && <MapPinOff className="h-4 w-4 shrink-0 text-red-600" aria-label="Sin ubicación: no entrará en la ruta" />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-suave">No hay albaranes pendientes en las zonas elegidas.</p>
            )}
            {fuera.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-marca">Añadir de otras zonas o sin zona ({fuera.length})</summary>
                <ul className="mt-2 divide-y divide-borde text-sm">
                  {fuera.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => {
                          setQuitados((s) => {
                            const n = new Set(s);
                            n.delete(a.id);
                            return n;
                          });
                          if (!(a.zonaId && zonasSel.includes(a.zonaId))) setExtra((s) => alternar(s, a.id));
                        }}
                        className="h-5 w-5 accent-[var(--marca)]"
                        aria-label={`Añadir ${a.nombre}`}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {a.nombre}
                        <span className="text-suave"> · {zonas.find((z) => z.id === a.zonaId)?.nombre ?? "sin zona"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <Link href="/logistica/albaranes" className="mt-2 inline-block text-sm text-marca underline">
              Subir más albaranes
            </Link>
          </Tarjeta>

          {seleccionados.length > 0 && <HojaCarga albaranes={seleccionados} titulo={`Hoja de carga del día (${seleccionados.length} albaranes)`} />}

          <Tarjeta>
            <p className="font-semibold">Vehículos</p>
            <div className="mt-2 space-y-1">
              {vehiculos.map((v) => (
                <label key={v.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" checked={vehiculosSel.includes(v.id)} onChange={() => setVehiculosSel((x) => (x.includes(v.id) ? x.filter((y) => y !== v.id) : [...x, v.id]))} className="h-5 w-5 accent-[var(--marca)]" />
                  <Truck className="h-5 w-5 text-marca" aria-hidden />
                  <span>
                    {v.nombre}
                    {v.matricula && <span className="text-suave"> · {v.matricula}</span>}
                    {v.capacidad_bultos != null && <span className="text-suave"> · {v.capacidad_bultos} bultos</span>}
                  </span>
                </label>
              ))}
              {!vehiculos.length && (
                <Link href="/logistica/vehiculos" className="text-sm text-marca underline">
                  Da de alta un vehículo
                </Link>
              )}
            </div>
          </Tarjeta>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
          <Boton type="button" className="min-h-14 w-full text-lg" cargando={calculando} disabled={!seleccionados.length || !vehiculosSel.length || !almacen} onClick={calcular}>
            <Sparkles className="h-6 w-6" aria-hidden /> {calculando ? "Calculando la mejor ruta…" : "Calcular la mejor ruta"}
          </Boton>
        </>
      )}

      {plan && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Tarjeta className="p-3">
              <Clock className="mx-auto h-5 w-5 text-marca" aria-hidden />
              <p className="mt-1 text-lg font-bold tabular-nums">{duracion(plan.totalMin)}</p>
              <p className="text-xs text-suave">tiempo total</p>
            </Tarjeta>
            <Tarjeta className="p-3">
              <Route className="mx-auto h-5 w-5 text-marca" aria-hidden />
              <p className="mt-1 text-lg font-bold tabular-nums">{plan.totalKm.toLocaleString("es-ES")} km</p>
              <p className="text-xs text-suave">recorrido</p>
            </Tarjeta>
            <Tarjeta className="p-3">
              <Leaf className="mx-auto h-5 w-5 text-emerald-600" aria-hidden />
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">−{plan.ahorroKm.toLocaleString("es-ES")} km</p>
              <p className="text-xs text-suave">vs. orden de llegada{plan.ahorroMin > 0 && ` (−${duracion(plan.ahorroMin)})`}</p>
            </Tarjeta>
          </div>
          {plan.fuente === "estimada" && (
            <p className="text-xs text-suave">Tiempos estimados. Con la clave de OpenRouteService se calculan con carreteras reales para camión.</p>
          )}
          {plan.avisos.map((a) => (
            <p key={a} className="flex items-start gap-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {a}
            </p>
          ))}

          {plan.rutas.map((r, k) => (
            <section key={r.vehiculoId} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORES[k % COLORES.length] }} aria-hidden />
                  {r.vehiculo}
                </h2>
                <p className="text-sm text-suave">
                  {r.salida}–{r.vuelta} · {r.km.toLocaleString("es-ES")} km
                </p>
              </div>
              <HojaCarga albaranes={albaranes.filter((a) => r.paradas.some((p) => p.albaranIds.includes(a.id)))} titulo={`Hoja de carga · ${r.vehiculo}`} />
              <label className="block text-sm font-medium">
                Conductor
                <select value={conductorDe[r.vehiculoId] ?? ""} onChange={(e) => setConductorDe((c) => ({ ...c, [r.vehiculoId]: e.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-borde bg-superficie px-3">
                  <option value="">Elige quién conduce</option>
                  {conductores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <ol className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie">
                {r.paradas.map((p, i) => (
                  <li key={p.destinoId} className="flex gap-3 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: p.retraso > 0 ? "#dc2626" : COLORES[k % COLORES.length] }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{p.nombre}</p>
                      <p className="truncate text-xs text-suave">{p.direccion}</p>
                      <p className="text-xs">
                        <span className="font-semibold">Llegada {p.llegada}</span>
                        {p.ventana && <span className="text-suave"> · horario {p.ventana}</span>}
                        {p.espera > 0 && <span className="text-suave"> · llegaría {p.espera} min antes de que abran</span>}
                        {p.retraso > 0 && <span className="font-semibold text-red-600"> · {p.retraso} min tarde</span>}
                        {p.numeros.length > 1 && <span className="text-suave"> · {p.numeros.length} albaranes</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
          <Boton type="button" className="min-h-14 w-full text-lg" cargando={aceptando} onClick={aceptar}>
            Aceptar y enviar al conductor
          </Boton>
          <p className="text-center text-xs text-suave">Al aceptar podrás descargar el PDF con la hoja de carga y el orden de reparto.</p>
          <Boton type="button" variante="secundario" className="w-full" onClick={() => setPlan(null)}>
            Cambiar la selección
          </Boton>
        </>
      )}
    </div>
  );
}
