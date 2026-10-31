"use client";

import { Check, ChevronDown, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState } from "react";
import { borrarRutaCompleta, type EstadoForm } from "@/app/(app)/logistica/acciones";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { euros, fecha as formatoFecha } from "@/lib/formato";

export interface DiaReparto {
  fecha: string;
  rutas: number;
  paradas: number;
  entregadas: number;
  fallidas: number;
}

export interface RutaDelDia {
  id: string;
  fecha: string;
  estado: string;
  notas: string | null;
  vehiculo: { nombre: string; matricula: string | null } | null;
  conductor: string | null;
  paradas: {
    id: string;
    orden: number;
    estado: "pendiente" | "entregada" | "fallida";
    realizada_at: string | null;
    llegada_prevista: string | null;
    albaran: string | null;
    motivo_fallo: string | null;
    cobrado: number | null;
    forma_cobro: string | null;
    envases_recogidos: number | null;
    observaciones: string | null;
    nombre: string | null;
    direccion: string | null;
    lineas: { descripcion: string; cantidad?: number; pedida?: number; entregada?: number }[];
  }[];
}

const nombreDia = (f: string) => {
  const largo = new Date(`${f}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const etiqueta = f === fechaDentroDe(0) ? "Hoy" : f === fechaDentroDe(-1) ? "Ayer" : f === fechaDentroDe(1) ? "Mañana" : null;
  return etiqueta ? `${etiqueta}, ${largo}` : largo.charAt(0).toUpperCase() + largo.slice(1);
};
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "");

export function HistorialReparto({ fecha, dias, rutas, esAdmin }: { fecha: string; dias: DiaReparto[]; rutas: RutaDelDia[]; esAdmin: boolean }) {
  const router = useRouter();
  const ir = (f: string) => router.push(`/reparto/dias?fecha=${f}`);
  const mover = (delta: number) => {
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + delta);
    ir(d.toISOString().slice(0, 10));
  };
  return (
    <div className="space-y-4 px-4 pb-8">
      <section className="rounded-2xl border border-borde bg-superficie p-3">
        <label className="block text-sm font-medium">
          Día
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => mover(-1)} aria-label="Día anterior" className="min-h-11 rounded-xl border border-borde px-3 text-lg active:bg-fondo">
              ‹
            </button>
            <input type="date" value={fecha} onChange={(e) => e.target.value && ir(e.target.value)} className="min-h-11 flex-1 rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca" />
            <button type="button" onClick={() => mover(1)} aria-label="Día siguiente" className="min-h-11 rounded-xl border border-borde px-3 text-lg active:bg-fondo">
              ›
            </button>
          </div>
        </label>
        {dias.length > 0 && (
          <>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-suave">Días con reparto</p>
            <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
              {dias.map((d) => (
                <Link
                  key={d.fecha}
                  href={`/reparto/dias?fecha=${d.fecha}`}
                  className={cn("shrink-0 rounded-xl border px-3 py-1.5 text-center text-sm", d.fecha === fecha ? "border-marca bg-marca-suave font-semibold" : "border-borde")}
                >
                  {formatoFecha(d.fecha)}
                  <span className="block text-[11px] text-suave">
                    {d.entregadas}/{d.paradas} entregadas
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <h2 className="text-lg font-bold">{nombreDia(fecha)}</h2>
      {!rutas.length && <p className="rounded-2xl border border-dashed border-borde p-4 text-center text-sm text-suave">No hubo reparto este día.</p>}
      {rutas.map((r) => (
        <TarjetaRuta key={r.id} r={r} esAdmin={esAdmin} />
      ))}
    </div>
  );
}

function TarjetaRuta({ r, esAdmin }: { r: RutaDelDia; esAdmin: boolean }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const entregadas = r.paradas.filter((p) => p.estado === "entregada").length;
  const fallidas = r.paradas.filter((p) => p.estado === "fallida").length;
  const cobrado = r.paradas.reduce((s, p) => s + (Number(p.cobrado) || 0), 0);
  return (
    <section className="overflow-hidden rounded-2xl border border-borde bg-superficie">
      <div className="p-4">
        <p className="font-semibold">
          {r.vehiculo ? `${r.vehiculo.nombre}${r.vehiculo.matricula ? ` (${r.vehiculo.matricula})` : ""}` : "Ruta"}
          {r.conductor && <span className="font-normal text-suave"> · {r.conductor}</span>}
        </p>
        <p className="text-sm text-suave">
          {entregadas === 1 ? "1 entregada" : `${entregadas} entregadas`}
          {fallidas ? ` · ${fallidas === 1 ? "1 no entregada" : `${fallidas} no entregadas`}` : ""}
          {r.paradas.length - entregadas - fallidas > 0 ? ` · ${r.paradas.length - entregadas - fallidas} sin hacer` : ""}
          {cobrado > 0 && ` · cobrado ${euros(cobrado)}`}
        </p>
      </div>
      <ol className="divide-y divide-borde border-t border-borde">
        {[...r.paradas]
          .sort((a, b) => a.orden - b.orden)
          .map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => setAbierta(abierta === p.id ? null : p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fondo">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    p.estado === "entregada" && "bg-emerald-600 text-white",
                    p.estado === "fallida" && "bg-red-600 text-white",
                    p.estado === "pendiente" && "bg-fondo text-suave",
                  )}
                >
                  {p.estado === "entregada" ? <Check className="h-4 w-4" /> : p.estado === "fallida" ? <X className="h-4 w-4" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.nombre ?? "—"}</span>
                  <span className="block truncate text-xs text-suave">
                    {p.estado === "entregada" ? `Entregado ${hora(p.realizada_at)}` : p.estado === "fallida" ? `No entregado: ${p.motivo_fallo ?? ""} ${hora(p.realizada_at)}` : "Sin hacer"}
                    {p.albaran && ` · ${p.albaran}`}
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-suave transition", abierta === p.id && "rotate-180")} aria-hidden />
              </button>
              {abierta === p.id && (
                <div className="space-y-1 px-4 pb-3 pl-14 text-sm">
                  {p.direccion && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`} target="_blank" rel="noreferrer" className="block text-suave underline decoration-dotted underline-offset-2">
                      {p.direccion}
                    </a>
                  )}
                  {p.lineas.map((l, j) => {
                    const n = l.entregada ?? l.cantidad ?? 0;
                    const falta = l.pedida != null && l.entregada != null && l.entregada < l.pedida;
                    return (
                      <p key={j} className={cn(falta && "text-amber-700 dark:text-amber-300")}>
                        {n} × {l.descripcion}
                        {falta && ` (de ${l.pedida})`}
                      </p>
                    );
                  })}
                  {(p.envases_recogidos ?? 0) > 0 && <p className="text-suave">{p.envases_recogidos} envases recogidos</p>}
                  {p.cobrado != null && Number(p.cobrado) > 0 && (
                    <p className="text-suave">
                      Cobrado {euros(Number(p.cobrado))}
                      {p.forma_cobro && ` (${p.forma_cobro})`}
                    </p>
                  )}
                  {p.observaciones && <p className="text-suave">Nota: {p.observaciones}</p>}
                </div>
              )}
            </li>
          ))}
      </ol>
      {esAdmin && <BorrarRutaDia id={r.id} />}
    </section>
  );
}

function BorrarRutaDia({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(borrarRutaCompleta, {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm("¿Borrar esta ruta? Se borra también lo registrado en ella (entregas, cobros). Sus albaranes vuelven a «por repartir». No se puede deshacer.")) return;
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="border-t border-borde p-3"
    >
      <input type="hidden" name="id" value={id} />
      {estado.error && <p className="mb-2 text-sm text-red-600">{estado.error}</p>}
      <Boton type="submit" variante="secundario" cargando={pendiente} className="min-h-11 w-full text-sm text-red-600">
        <Trash2 className="h-4 w-4" aria-hidden /> Borrar esta ruta
      </Boton>
    </form>
  );
}
