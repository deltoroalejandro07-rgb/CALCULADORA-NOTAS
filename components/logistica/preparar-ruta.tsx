"use client";

import { ArrowDown, ArrowUp, ExternalLink, MapPin, Phone, StickyNote, Truck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { crearRutaManual } from "@/app/(app)/logistica/acciones-planificar";
import { Tarjeta } from "@/components/app/piezas";
import { CargaPorFamilias } from "@/components/logistica/carga-familias";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { totalCarga } from "@/lib/dominio/reparto";

export interface ClienteDelDia {
  /** Una parada por albarán: aunque dos albaranes tengan el mismo nombre, se reparten por separado. */
  clave: string;
  destinoId: string;
  nombre: string;
  direccion: string;
  telefono: string | null;
  horario: string | null;
  observaciones: string | null;
  zonaId: string | null;
  ordenHabitual: number | null;
  albaranes: { id: string; numero: string | null; lineas: { descripcion: string; cantidad: number }[] }[];
}

const campo = "min-h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-sm outline-none focus:border-marca lg:min-h-10";
export const enlaceMaps = (direccion: string, nombre?: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion || nombre || "")}`;

/** Orden de partida: el habitual de cada cliente; los nuevos, al final por nombre. */
const ordenInicial = (cs: ClienteDelDia[]) =>
  [...cs].sort((a, b) => (a.ordenHabitual ?? 9999) - (b.ordenHabitual ?? 9999) || a.nombre.localeCompare(b.nombre, "es")).map((c) => c.clave);

export function PrepararRuta({
  fecha,
  dia,
  clientes,
  zonas,
  vehiculos,
  conductores,
}: {
  fecha: string;
  dia: number;
  clientes: ClienteDelDia[];
  zonas: { id: string; nombre: string; dias: number[]; vehiculo_id: string | null }[];
  vehiculos: { id: string; nombre: string; matricula: string | null; conductor_habitual: string | null }[];
  conductores: { id: string; nombre: string }[];
}) {
  const zonasHoy = zonas.filter((z) => z.dias.includes(dia)).map((z) => z.id);
  // Marcados de entrada: los de las zonas que tocan hoy (si no hay zonas, todos)
  const porDefecto = (c: ClienteDelDia) => !zonas.length || (!!c.zonaId && zonasHoy.includes(c.zonaId)) || !c.zonaId;
  const [conocidos, setConocidos] = useState<Set<string>>(() => new Set(clientes.map((c) => c.clave)));
  const [marcadosGuardados, setMarcados] = useState<Set<string>>(() => new Set(clientes.filter(porDefecto).map((c) => c.clave)));
  const [ordenGuardado, setOrden] = useState<string[]>(() => ordenInicial(clientes));
  const [horas, setHoras] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [otras, setOtras] = useState<Record<string, string>>({});
  const vehiculoZona = zonas.find((z) => zonasHoy.includes(z.id) && z.vehiculo_id)?.vehiculo_id;
  const [vehiculo, setVehiculo] = useState(vehiculoZona ?? vehiculos[0]?.id ?? "");
  const [conductor, setConductor] = useState(vehiculos.find((v) => v.id === (vehiculoZona ?? vehiculos[0]?.id))?.conductor_habitual ?? "");
  const [guardarOrden, setGuardarOrden] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, empezar] = useTransition();

  const porId = useMemo(() => new Map(clientes.map((c) => [c.clave, c])), [clientes]);
  // Si se suben o borran albaranes con la pantalla abierta, se ve al momento: los borrados
  // desaparecen y los nuevos se añaden al final (sin perder el orden ya hecho a mano)
  const nuevos = clientes.filter((c) => !conocidos.has(c.clave));
  const orden = [...ordenGuardado.filter((k) => porId.has(k)), ...ordenInicial(nuevos)];
  const marcados = new Set([...marcadosGuardados, ...nuevos.filter(porDefecto).map((c) => c.clave)]);
  const fijar = () => setConocidos(new Set(clientes.map((c) => c.clave)));
  const enRuta = orden.filter((id) => marcados.has(id)).map((id) => porId.get(id)!);
  const fuera = orden.filter((id) => !marcados.has(id)).map((id) => porId.get(id)!);
  const carga = totalCarga(enRuta.flatMap((c) => c.albaranes.map((a) => ({ lineas: a.lineas.map((l) => ({ producto_id: null, ...l })) }))));

  const mover = (id: string, delta: -1 | 1) => {
    const lista = orden.filter((x) => marcados.has(x));
    const i = lista.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setOrden([...lista, ...orden.filter((x) => !marcados.has(x))]);
    setMarcados(marcados);
    fijar();
  };
  const alternar = (id: string) => {
    const n = new Set(marcados);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setMarcados(n);
    setOrden(orden);
    fijar();
  };

  function crear() {
    setError(null);
    if (!conductor) return setError("Elige quién conduce.");
    empezar(async () => {
      const r = await crearRutaManual({
        fecha,
        vehiculoId: vehiculo || null,
        conductorId: conductor,
        guardarOrden,
        paradas: enRuta.map((c) => ({
          destinoId: c.destinoId,
          albaranIds: c.albaranes.map((a) => a.id),
          hora: horas[c.clave] || null,
          nota: notas[c.clave] || null,
          otraDireccion: otras[c.clave] || null,
        })),
      });
      if (r?.error) setError(r.error);
    });
  }

  if (!clientes.length)
    return (
      <div className="px-4 pb-8">
        <p className="rounded-xl border border-dashed border-borde p-6 text-center text-sm text-suave">No hay albaranes por repartir. Primero súbelos en el paso 1.</p>
      </div>
    );

  return (
    <div className="space-y-4 px-4 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-5 lg:space-y-0">
      <div className="space-y-4">
        <Tarjeta>
          <p className="font-semibold">Orden de entrega ({enRuta.length})</p>
          <p className="text-xs text-suave">Sale con el orden habitual de cada cliente. Muévelos con las flechas y, si quieres, pon la hora.</p>
          <ol className="mt-2 divide-y divide-borde">
            {enRuta.map((c, i) => (
              <li key={c.clave} className="flex gap-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marca text-sm font-bold text-marca-texto">{i + 1}</span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {c.nombre}
                    <span className="font-normal text-suave"> · {c.albaranes.map((a) => a.numero ?? "albarán").join(", ")}</span>
                  </p>
                  <a href={enlaceMaps(c.direccion, c.nombre)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-marca underline decoration-dotted underline-offset-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> {c.direccion || "Sin dirección"} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                  {(c.horario || c.telefono) && (
                    <p className="text-xs text-suave">
                      {c.horario && `🕘 ${c.horario}`}
                      {c.horario && c.telefono && " · "}
                      {c.telefono && (
                        <a href={`tel:${c.telefono}`} className="inline-flex items-center gap-0.5">
                          <Phone className="h-3 w-3" aria-hidden /> {c.telefono}
                        </a>
                      )}
                    </p>
                  )}
                  {c.observaciones && (
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {c.observaciones}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-suave">
                      Hora
                      <input
                        type="time"
                        value={horas[c.clave] ?? ""}
                        onChange={(e) => setHoras((h) => ({ ...h, [c.clave]: e.target.value }))}
                        aria-label={`Hora de ${c.nombre}${c.albaranes[0]?.numero ? ` (${c.albaranes[0].numero})` : ""}`}
                        className="min-h-8 rounded-md border border-borde bg-superficie px-1.5 text-xs"
                      />
                    </label>
                    <button type="button" onClick={() => alternar(c.clave)} className="text-xs text-suave underline">
                      Quitar de esta ruta
                    </button>
                  </div>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    <textarea
                      value={notas[c.clave] ?? ""}
                      onChange={(e) => setNotas((n) => ({ ...n, [c.clave]: e.target.value }))}
                      rows={2}
                      maxLength={1000}
                      placeholder="Nota para el repartidor (solo este pedido)"
                      aria-label={`Nota para el repartidor: ${c.nombre}${c.albaranes[0]?.numero ? ` (${c.albaranes[0].numero})` : ""}`}
                      className="w-full resize-y rounded-md border border-borde bg-superficie px-2 py-1.5 text-xs outline-none focus:border-marca"
                    />
                    <div>
                      <input
                        value={otras[c.clave] ?? ""}
                        onChange={(e) => setOtras((o) => ({ ...o, [c.clave]: e.target.value }))}
                        maxLength={300}
                        placeholder="Entregar en otra dirección (solo hoy)"
                        aria-label={`Otra dirección de entrega: ${c.nombre}${c.albaranes[0]?.numero ? ` (${c.albaranes[0].numero})` : ""}`}
                        className={cn("w-full rounded-md border bg-superficie px-2 py-1.5 text-xs outline-none focus:border-marca", otras[c.clave] ? "border-amber-400" : "border-borde")}
                      />
                      {otras[c.clave]?.trim() && (
                        <a href={enlaceMaps(otras[c.clave])} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-marca underline">
                          <ExternalLink className="h-3 w-3" aria-hidden /> Comprobar en Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col">
                  <button type="button" onClick={() => mover(c.clave, -1)} disabled={i === 0} aria-label={`Subir ${c.nombre}`} className="rounded-md p-1.5 text-suave hover:bg-fondo disabled:opacity-30">
                    <ArrowUp className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => mover(c.clave, 1)} disabled={i === enRuta.length - 1} aria-label={`Bajar ${c.nombre}`} className="rounded-md p-1.5 text-suave hover:bg-fondo disabled:opacity-30">
                    <ArrowDown className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!enRuta.length && <p className="mt-2 text-sm text-suave">Marca abajo los clientes que van en esta furgoneta.</p>}
        </Tarjeta>

        {fuera.length > 0 && (
          <Tarjeta>
            <p className="font-semibold">Otros albaranes por repartir ({fuera.length})</p>
            <p className="text-xs text-suave">De otras zonas o para otra furgoneta. Márcalos para añadirlos a esta ruta.</p>
            <ul className="mt-2 divide-y divide-borde text-sm">
              {fuera.map((c) => (
                <li key={c.clave} className="flex items-center gap-2 py-2">
                  <input type="checkbox" checked={false} onChange={() => alternar(c.clave)} aria-label={`Añadir ${c.nombre}`} className="h-5 w-5 accent-[var(--marca)]" />
                  <span className="min-w-0 flex-1 truncate">
                    {c.nombre}
                    <span className="text-suave">
                      {c.albaranes[0]?.numero ? ` · ${c.albaranes[0].numero}` : ""} · {zonas.find((z) => z.id === c.zonaId)?.nombre ?? "sin zona"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-6">
        <Tarjeta>
          <p className="flex items-center gap-2 font-semibold">
            <Truck className="h-5 w-5 text-marca" aria-hidden /> Furgoneta y conductor
          </p>
          <label className="mt-2 block text-sm font-medium">
            Furgoneta
            <select
              value={vehiculo}
              onChange={(e) => {
                setVehiculo(e.target.value);
                const habitual = vehiculos.find((v) => v.id === e.target.value)?.conductor_habitual;
                if (habitual) setConductor(habitual);
              }}
              className={cn(campo, "mt-1")}
            >
              <option value="">Sin furgoneta</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                  {v.matricula ? ` · ${v.matricula}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-sm font-medium">
            Conductor
            <select value={conductor} onChange={(e) => setConductor(e.target.value)} className={cn(campo, "mt-1")}>
              <option value="">Elige quién conduce</option>
              {conductores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={guardarOrden} onChange={(e) => setGuardarOrden(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--marca)]" />
            <span>
              Guardar este orden como el habitual
              <span className="block text-xs text-suave">La próxima vez estos clientes saldrán ya en este orden.</span>
            </span>
          </label>
        </Tarjeta>

        {carga.length > 0 && (
          <Tarjeta>
            <p className="mb-2 font-semibold">Hoja de carga de esta ruta</p>
            <CargaPorFamilias lineas={carga} />
          </Tarjeta>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
        <Boton type="button" className="min-h-14 w-full text-lg" cargando={creando} disabled={!enRuta.length} onClick={crear}>
          Crear la ruta y enviarla al conductor
        </Boton>
        <p className="text-center text-xs text-suave">
          {enRuta.length} {enRuta.length === 1 ? "pedido" : "pedidos"}
          {fuera.length > 0 && ` · los ${fuera.length} restantes quedan para otra furgoneta`}
        </p>
      </div>
    </div>
  );
}
