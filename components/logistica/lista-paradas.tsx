"use client";

import { ArrowDown, ArrowUp, Check, FileText, MapPinOff, Navigation, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { guardarEntregaCliente, guardarNotaParada, moverParadaAccion, ordenarPorCercania, quitarParada, type EstadoForm } from "@/app/(app)/logistica/acciones";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import type { EstadoParada } from "@/lib/dominio/reparto";
import { euros, fechaHora } from "@/lib/formato";

export interface ParadaOficina {
  id: string;
  orden: number;
  estado: EstadoParada;
  notas_oficina: string | null;
  realizada_at: string | null;
  firmante: string | null;
  motivo_fallo: string | null;
  envases_recogidos: number;
  cobrado: number | null;
  /** «cliente» del CRM o «destino» de un albarán de Holded (sin ficha en el CRM). */
  cliente: { tipo: "cliente" | "destino"; id: string; nombre: string; direccion: string; sinUbicacion: boolean; horario_entrega: string | null; notas_acceso: string | null };
  llegada_prevista: string | null;
  albaran: string | null;
  pedido: { fecha: string | null; importe: number | null; lineas: string[] } | null;
}

const campo = "mt-1 min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-sm outline-none focus:border-marca";

function EditarParada({ p, alCerrar }: { p: ParadaOficina; alCerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarEntregaCliente, {});
  return (
    <div className="mt-3 space-y-3 rounded-xl bg-fondo p-3">
      {p.cliente.tipo === "destino" ? (
        <p className="text-sm text-suave">
          El horario y el acceso de este cliente se cambian en{" "}
          <Link href="/logistica/albaranes" className="text-marca underline">
            Albaranes
          </Link>
          .
        </p>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const datos = new FormData(e.currentTarget);
          startTransition(() => accion(datos));
        }}
        className="space-y-2"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-suave">Datos de entrega del cliente (para todas sus rutas)</p>
        <input type="hidden" name="cliente_id" value={p.cliente.id} />
        <label className="block text-sm">
          Horario de descarga
          <input name="horario_entrega" defaultValue={p.cliente.horario_entrega ?? ""} placeholder="L-V 8:00-11:00" className={campo} />
        </label>
        <label className="block text-sm">
          Cómo llegar / acceso
          <input name="notas_acceso" defaultValue={p.cliente.notas_acceso ?? ""} placeholder="Entrar por la calle de atrás, timbre 2" className={campo} />
        </label>
        {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
        {estado.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
        <Boton type="submit" variante="secundario" cargando={pendiente} className="min-h-11 w-full text-sm">
          Guardar datos del cliente
        </Boton>
      </form>
      )}
      <form action={guardarNotaParada} className="space-y-2">
        <input type="hidden" name="id" value={p.id} />
        <label className="block text-sm">
          Nota solo para esta entrega
          <input name="notas_oficina" defaultValue={p.notas_oficina ?? ""} placeholder="Cobrar la factura pendiente" className={campo} />
        </label>
        <Boton type="submit" variante="secundario" className="min-h-11 w-full text-sm">
          Guardar nota
        </Boton>
      </form>
      <button type="button" onClick={alCerrar} className="w-full py-1 text-sm text-suave underline">
        Cerrar
      </button>
    </div>
  );
}

export function ListaParadas({ rutaId, paradas, editable, reordenable }: { rutaId: string; paradas: ParadaOficina[]; editable: boolean; reordenable: boolean }) {
  const [editando, setEditando] = useState<string | null>(null);
  if (!paradas.length) {
    return <p className="rounded-2xl border border-dashed border-borde p-4 text-center text-sm text-suave">Esta ruta aún no tiene paradas. Añade pedidos abajo.</p>;
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-suave">Paradas ({paradas.length})</h2>
        {reordenable && paradas.length > 1 && (
          <form action={ordenarPorCercania}>
            <input type="hidden" name="ruta_id" value={rutaId} />
            <button type="submit" className="flex items-center gap-1 text-sm font-medium text-marca">
              <Navigation className="h-4 w-4" aria-hidden /> Ordenar por cercanía
            </button>
          </form>
        )}
      </div>
      <ol className="space-y-2">
        {paradas.map((p, i) => (
          <li key={p.id} className={cn("rounded-2xl border bg-superficie p-3", p.estado === "fallida" ? "border-red-300 dark:border-red-900" : "border-borde")}>
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  p.estado === "entregada" && "bg-emerald-600 text-white",
                  p.estado === "fallida" && "bg-red-600 text-white",
                  p.estado === "pendiente" && "bg-marca text-marca-texto",
                )}
              >
                {p.estado === "entregada" ? <Check className="h-4 w-4" /> : p.estado === "fallida" ? <X className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.cliente.nombre}</p>
                <p className="flex items-center gap-1 text-sm text-suave">
                  {p.cliente.sinUbicacion && <MapPinOff className="h-4 w-4 shrink-0 text-amber-600" aria-label="Sin ubicación en el mapa" />}
                  {p.cliente.direccion || "Sin dirección"}
                </p>
                {(p.cliente.horario_entrega || p.cliente.notas_acceso) && (
                  <p className="text-xs text-suave">{[p.cliente.horario_entrega && `🕘 ${p.cliente.horario_entrega}`, p.cliente.notas_acceso].filter(Boolean).join(" · ")}</p>
                )}
                {p.llegada_prevista && p.estado === "pendiente" && <p className="text-xs font-medium text-marca">Llegada prevista {p.llegada_prevista}</p>}
                {p.pedido ? (
                  <p className="mt-1 text-sm">
                    {p.albaran ? `Albarán ${p.albaran}` : p.pedido.importe != null ? `Pedido ${euros(p.pedido.importe)}` : "Entrega"}: <span className="text-suave">{p.pedido.lineas.join(", ") || "sin líneas"}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-suave">Parada sin pedido (recogida, visita…)</p>
                )}
                {p.notas_oficina && <p className="text-sm text-amber-700 dark:text-amber-300">Nota: {p.notas_oficina}</p>}
                {p.estado === "entregada" && (
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                    Entregada {p.realizada_at && fechaHora(p.realizada_at)}
                    {p.firmante && ` · firma ${p.firmante}`}
                    {p.envases_recogidos > 0 && ` · ${p.envases_recogidos} envases recogidos`}
                    {p.cobrado != null && p.cobrado > 0 && ` · cobrado ${euros(p.cobrado)}`}
                  </p>
                )}
                {p.estado === "fallida" && (
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    No entregada: {p.motivo_fallo} {p.realizada_at && `(${fechaHora(p.realizada_at)})`}. El pedido vuelve a «por repartir».
                  </p>
                )}
                {p.estado !== "pendiente" && (
                  <Link href={`/logistica/albaran/${p.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-marca underline">
                    <FileText className="h-4 w-4" aria-hidden /> Ver albarán
                  </Link>
                )}
              </div>
              {editable && p.estado === "pendiente" && (
                <div className="flex shrink-0 flex-col items-center gap-1">
                  {reordenable && (
                    <>
                      <form action={moverParadaAccion}>
                        <input type="hidden" name="ruta_id" value={rutaId} />
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="delta" value="-1" />
                        <button type="submit" disabled={i === 0} aria-label="Subir" className="rounded-full p-1.5 text-suave active:bg-fondo disabled:opacity-30">
                          <ArrowUp className="h-5 w-5" />
                        </button>
                      </form>
                      <form action={moverParadaAccion}>
                        <input type="hidden" name="ruta_id" value={rutaId} />
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="delta" value="1" />
                        <button type="submit" disabled={i === paradas.length - 1} aria-label="Bajar" className="rounded-full p-1.5 text-suave active:bg-fondo disabled:opacity-30">
                          <ArrowDown className="h-5 w-5" />
                        </button>
                      </form>
                    </>
                  )}
                  <button type="button" onClick={() => setEditando(editando === p.id ? null : p.id)} aria-label="Editar datos de entrega" className="rounded-full p-1.5 text-suave active:bg-fondo">
                    <Pencil className="h-5 w-5" />
                  </button>
                  <form
                    action={quitarParada}
                    onSubmit={(e) => {
                      if (!confirm(`¿Quitar ${p.cliente.nombre} de la ruta? El pedido vuelve a «por repartir».`)) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="ruta_id" value={rutaId} />
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" aria-label="Quitar de la ruta" className="rounded-full p-1.5 text-red-600 active:bg-fondo">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
            {editando === p.id && <EditarParada p={p} alCerrar={() => setEditando(null)} />}
          </li>
        ))}
      </ol>
    </section>
  );
}
