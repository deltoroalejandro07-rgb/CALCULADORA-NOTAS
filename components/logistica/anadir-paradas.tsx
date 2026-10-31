"use client";

import { Plus } from "lucide-react";
import { startTransition, useActionState, useMemo, useState } from "react";
import { anadirParadas, type EstadoForm } from "@/app/(app)/logistica/acciones";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { fecha } from "@/lib/formato";

export function AnadirParadas({
  rutaId,
  albaranes,
  clientes,
}: {
  rutaId: string;
  albaranes: { id: string; numero: string | null; fecha: string | null; cliente: string; zona: string | null }[];
  clientes: { id: string; nombre_negocio: string; zona: string | null }[];
}) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(anadirParadas, {});
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [sueltos, setSueltos] = useState<string[]>([]);

  const coincidencias = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes.filter((c) => !sueltos.includes(c.id) && (c.nombre_negocio.toLowerCase().includes(q) || c.zona?.toLowerCase().includes(q))).slice(0, 6);
  }, [busca, clientes, sueltos]);

  const alternar = (id: string) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Tarjeta>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const datos = new FormData(e.currentTarget);
          startTransition(() => {
            accion(datos);
            setMarcados(new Set());
            setSueltos([]);
          });
        }}
        className="space-y-3"
      >
        <input type="hidden" name="ruta_id" value={rutaId} />
        <p className="font-semibold">Añadir paradas</p>

        <div>
          <p className="text-sm font-medium">Albaranes por repartir ({albaranes.length})</p>
          {albaranes.length ? (
            <ul className="mt-2 max-h-80 divide-y divide-borde overflow-y-auto rounded-lg border border-borde">
              {albaranes.map((a) => (
                <li key={a.id}>
                  <label className="flex min-h-12 items-center gap-3 px-3 py-2">
                    <input type="checkbox" name="albaran" value={a.id} checked={marcados.has(a.id)} onChange={() => alternar(a.id)} className="h-5 w-5 accent-[var(--marca)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.cliente}</span>
                      <span className="text-xs text-suave">
                        {[a.numero, a.fecha && fecha(a.fecha), a.zona].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-suave">No hay albaranes pendientes. Súbelos en Logística → Albaranes.</p>
          )}
          {albaranes.length > 1 && (
            <button type="button" onClick={() => setMarcados(marcados.size === albaranes.length ? new Set() : new Set(albaranes.map((a) => a.id)))} className="mt-1 text-sm text-marca underline">
              {marcados.size === albaranes.length ? "Quitar todos" : "Marcar todos"}
            </button>
          )}
        </div>

        <div>
          <p className="text-sm font-medium">Parada sin albarán (cliente del CRM)</p>
          <p className="text-xs text-suave">Recoger envases, llevar material, una devolución…</p>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente" className="mt-2 min-h-11 w-full rounded-lg border border-borde bg-superficie px-3 outline-none focus:border-marca" />
          {coincidencias.length > 0 && (
            <ul className="mt-1 divide-y divide-borde rounded-lg border border-borde">
              {coincidencias.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSueltos((s) => [...s, c.id]);
                      setBusca("");
                    }}
                    className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm active:bg-fondo"
                  >
                    <Plus className="h-4 w-4 text-marca" aria-hidden /> {c.nombre_negocio}
                    {c.zona && <span className="text-suave">· {c.zona}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sueltos.map((id) => (
            <p key={id} className="mt-1 flex items-center justify-between rounded-lg bg-fondo px-3 py-2 text-sm">
              <input type="hidden" name="cliente" value={id} />
              {clientes.find((c) => c.id === id)?.nombre_negocio}
              <button type="button" onClick={() => setSueltos((s) => s.filter((x) => x !== id))} className="text-suave underline">
                Quitar
              </button>
            </p>
          ))}
        </div>

        {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
        {estado.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
        <Boton type="submit" cargando={pendiente} disabled={!marcados.size && !sueltos.length} className="w-full">
          Añadir a la ruta{marcados.size + sueltos.length ? ` (${marcados.size + sueltos.length})` : ""}
        </Boton>
      </form>
    </Tarjeta>
  );
}
