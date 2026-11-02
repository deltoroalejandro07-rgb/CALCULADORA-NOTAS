"use client";

import { ExternalLink, MapPin, Pencil, Phone, Search, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { EditarDestino, type Destino } from "@/components/logistica/albaranes";
import { textoFranja } from "@/lib/dominio/horario";
import { normalizarTexto } from "@/lib/dominio/visita";

const maps = (d: Destino) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.lat != null ? `${d.lat},${d.lng}` : [d.direccion, d.codigo_postal, d.localidad].filter(Boolean).join(", ") || d.nombre)}`;

/** Listado de clientes de reparto con su ficha para el repartidor. */
export function ClientesReparto({ destinos, zonas }: { destinos: Destino[]; zonas: { id: string; nombre: string }[] }) {
  const [q, setQ] = useState("");
  const [zona, setZona] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const lista = useMemo(() => {
    const t = normalizarTexto(q);
    return destinos.filter((d) => (!zona || (zona === "sin" ? !d.zona_id : d.zona_id === zona)) && (!t || normalizarTexto(`${d.nombre} ${d.direccion ?? ""} ${d.localidad ?? ""} ${d.notas_acceso ?? ""}`).includes(t)));
  }, [destinos, q, zona]);

  return (
    <div className="space-y-3 px-4 pb-8">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, calle o nota" aria-label="Buscar cliente de reparto" className="min-h-11 w-full rounded-lg border border-borde bg-superficie pl-9 pr-3 text-sm outline-none focus:border-marca" />
        </label>
        <select value={zona} onChange={(e) => setZona(e.target.value)} aria-label="Zona" className="min-h-11 rounded-lg border border-borde bg-superficie px-3 text-sm">
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
          <option value="sin">Sin zona</option>
        </select>
      </div>
      <p className="text-sm text-suave">
        {lista.length} de {destinos.length} clientes. Se crean solos al subir sus albaranes de Holded.
      </p>
      <ul className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {lista.map((d) => {
          const horario = d.horario_texto ?? textoFranja(d.ventana_desde, d.ventana_hasta);
          const dir = [d.direccion, d.localidad].filter(Boolean).join(", ");
          return (
            <li key={d.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {d.nombre}
                    <span className="font-normal text-suave">
                      {" · "}
                      {zonas.find((z) => z.id === d.zona_id)?.nombre ?? "sin zona"}
                      {d.orden_habitual ? ` · orden habitual ${d.orden_habitual}` : ""}
                    </span>
                  </p>
                  <a href={maps(d)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-marca underline decoration-dotted underline-offset-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> {dir || "Sin dirección"} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                  {(horario || d.telefono) && (
                    <p className="text-xs text-suave">
                      {horario && `🕘 ${horario}`}
                      {horario && d.telefono && " · "}
                      {d.telefono && (
                        <a href={`tel:${d.telefono}`} className="inline-flex items-center gap-0.5">
                          <Phone className="h-3 w-3" aria-hidden /> {d.telefono}
                        </a>
                      )}
                    </p>
                  )}
                  {d.notas_acceso ? (
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {d.notas_acceso}
                    </p>
                  ) : (
                    <p className="text-xs text-suave">Sin observaciones para el repartidor.</p>
                  )}
                </div>
                <button type="button" onClick={() => setEditando(editando === d.id ? null : d.id)} aria-label={`Editar ${d.nombre}`} className="rounded-md p-2 text-suave hover:bg-fondo">
                  <Pencil className="h-5 w-5" />
                </button>
              </div>
              {editando === d.id && <EditarDestino d={d} zonas={zonas} alCerrar={() => setEditando(null)} />}
            </li>
          );
        })}
        {!lista.length && <li className="p-6 text-center text-sm text-suave">{destinos.length ? "Ningún cliente con ese filtro." : "Aún no hay clientes: se crean al subir los albaranes."}</li>}
      </ul>
    </div>
  );
}
