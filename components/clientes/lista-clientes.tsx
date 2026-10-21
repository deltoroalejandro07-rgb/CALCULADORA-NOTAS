"use client";

import { ChevronRight, List, Map as MapaIcono, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Demo, EtiquetaEstado, IconoTemperatura } from "@/components/app/piezas";
import { MapaDinamico } from "@/components/mapa/mapa-dinamico";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { calcularTemperatura, TEXTO_TEMPERATURA, type Temperatura } from "@/lib/dominio/temperatura";
import {
  ESTADOS_CLIENTE,
  TEXTO_ESTADO,
  TEXTO_TIPO_NEGOCIO,
  TIPOS_NEGOCIO,
  type EstadoCliente,
  type ResultadoVisita,
  type TipoNegocio,
} from "@/lib/dominio/tipos";
import { fechaDentroDe, normalizarTexto } from "@/lib/dominio/visita";
import { fecha } from "@/lib/formato";

export interface ClienteLista {
  id: string;
  nombre_negocio: string;
  tipo: TipoNegocio;
  zona: string | null;
  contacto_nombre: string | null;
  direccion: string | null;
  estado: EstadoCliente;
  ultimo_resultado: ResultadoVisita | null;
  ultimo_resultado_at: string | null;
  ultima_visita_at: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  lat: number | null;
  lng: number | null;
  is_seed: boolean;
  comercial: string | null;
}

/** Filtros rápidos que llegan desde el panel Hoy: /clientes?filtro=vencidos */
export const FILTROS_RAPIDOS = {
  vencidos: "Seguimiento vencido",
  hoy: "Seguimiento hoy",
  calientes: "Oportunidades calientes",
  olvidados: "Sin visitar +30 días",
} as const;
type FiltroRapido = keyof typeof FILTROS_RAPIDOS;

export function cumpleFiltroRapido(c: ClienteLista, f: FiltroRapido, hoy = fechaDentroDe(0)): boolean {
  const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  if (c.estado === "perdido") return false;
  switch (f) {
    case "vencidos":
      return !!c.proxima_accion_fecha && c.proxima_accion_fecha < hoy;
    case "hoy":
      return c.proxima_accion_fecha === hoy;
    case "calientes":
      return (c.ultimo_resultado === "pide_oferta" || c.ultimo_resultado === "interesado") && !!c.ultimo_resultado_at && c.ultimo_resultado_at >= haceDias(14);
    case "olvidados":
      return !c.ultima_visita_at || c.ultima_visita_at < haceDias(30);
  }
}

export function ListaClientes({ clientes, esAdmin }: { clientes: ClienteLista[]; esAdmin: boolean }) {
  const inicial = useSearchParams().get("filtro");
  const [busqueda, setBusqueda] = useState("");
  const [rapido, setRapido] = useState<FiltroRapido | null>(inicial && inicial in FILTROS_RAPIDOS ? (inicial as FiltroRapido) : null);
  const [estados, setEstados] = useState<EstadoCliente[]>([]);
  const [temps, setTemps] = useState<Temperatura[]>([]);
  const [tipo, setTipo] = useState<TipoNegocio | "">("");
  const [zona, setZona] = useState("");
  const [verFiltros, setVerFiltros] = useState(false);
  const [vista, setVista] = useState<"lista" | "mapa">("lista");

  const zonas = useMemo(() => [...new Set(clientes.map((c) => c.zona).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es")), [clientes]);
  const conTemp = useMemo(() => clientes.map((c) => ({ c, t: calcularTemperatura(c) })), [clientes]);

  const filtrados = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return conTemp.filter(
      ({ c, t }) =>
        (!q || normalizarTexto(`${c.nombre_negocio} ${c.zona ?? ""} ${c.contacto_nombre ?? ""} ${c.direccion ?? ""}`).includes(q)) &&
        (!rapido || cumpleFiltroRapido(c, rapido)) &&
        (!estados.length || estados.includes(c.estado)) &&
        (!temps.length || temps.includes(t)) &&
        (!tipo || c.tipo === tipo) &&
        (!zona || c.zona === zona),
    );
  }, [conTemp, busqueda, rapido, estados, temps, tipo, zona]);

  const activos = (rapido ? 1 : 0) + estados.length + temps.length + (tipo ? 1 : 0) + (zona ? 1 : 0);
  const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const select = "min-h-11 rounded-xl border border-borde bg-superficie px-3 text-sm";

  return (
    <>
      <div className="space-y-2 px-4">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Buscar clientes</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-suave" aria-hidden />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, zona, contacto…"
              className="min-h-12 w-full rounded-xl border border-borde bg-superficie pl-11 pr-3 outline-none focus:border-marca"
            />
          </label>
          <button
            type="button"
            onClick={() => setVerFiltros((v) => !v)}
            aria-expanded={verFiltros}
            className={cn("relative flex min-h-12 items-center gap-1 rounded-xl border px-3 text-sm font-medium", activos ? "border-marca text-marca" : "border-borde")}
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
            Filtros
            {activos > 0 && <span className="ml-0.5 rounded-full bg-marca px-1.5 text-xs text-marca-texto">{activos}</span>}
          </button>
        </div>

        {verFiltros && (
          <div className="space-y-3 rounded-2xl border border-borde bg-superficie p-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILTROS_RAPIDOS) as FiltroRapido[]).map((f) => (
                <Chip key={f} activo={rapido === f} onClick={() => setRapido(rapido === f ? null : f)}>
                  {FILTROS_RAPIDOS[f]}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ESTADOS_CLIENTE.map((e) => (
                <Chip key={e} activo={estados.includes(e)} onClick={() => setEstados(alternar(estados, e))}>
                  {TEXTO_ESTADO[e]}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["caliente", "templado", "frio"] as Temperatura[]).map((t) => (
                <Chip key={t} activo={temps.includes(t)} onClick={() => setTemps(alternar(temps, t))}>
                  <IconoTemperatura t={t} /> {TEXTO_TEMPERATURA[t]}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoNegocio | "")} aria-label="Tipo de negocio" className={select}>
                <option value="">Todos los tipos</option>
                {TIPOS_NEGOCIO.map((t) => (
                  <option key={t} value={t}>
                    {TEXTO_TIPO_NEGOCIO[t]}
                  </option>
                ))}
              </select>
              <select value={zona} onChange={(e) => setZona(e.target.value)} aria-label="Zona" className={select}>
                <option value="">Todas las zonas</option>
                {zonas.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
            {activos > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRapido(null);
                  setEstados([]);
                  setTemps([]);
                  setTipo("");
                  setZona("");
                }}
                className="text-sm font-medium text-marca underline"
              >
                Quitar filtros
              </button>
            )}
          </div>
        )}

        {rapido && !verFiltros && (
          <div className="flex items-center gap-2">
            <Chip activo onClick={() => setRapido(null)} aria-label={`Quitar filtro ${FILTROS_RAPIDOS[rapido]}`}>
              {FILTROS_RAPIDOS[rapido]} ✕
            </Chip>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-suave">
            {filtrados.length} de {clientes.length}
          </p>
          <div className="flex rounded-xl border border-borde p-0.5" role="tablist" aria-label="Vista">
            {(
              [
                ["lista", "Lista", List],
                ["mapa", "Mapa", MapaIcono],
              ] as const
            ).map(([v, texto, Icono]) => (
              <button
                key={v}
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className={cn("flex min-h-9 items-center gap-1 rounded-lg px-3 text-sm", vista === v ? "bg-marca text-marca-texto" : "text-suave")}
              >
                <Icono className="h-4 w-4" aria-hidden /> {texto}
              </button>
            ))}
          </div>
        </div>
      </div>

      {vista === "mapa" ? (
        <div className="mt-2 px-4">
          <MapaDinamico
            puntos={filtrados
              .filter(({ c }) => c.lat != null && c.lng != null)
              .map(({ c }) => ({ id: c.id, nombre: c.nombre_negocio, lat: c.lat!, lng: c.lng!, estado: c.estado, detalle: c.zona ?? undefined }))}
          />
          <p className="mt-1 text-xs text-suave">
            {filtrados.filter(({ c }) => c.lat == null).length} sin ubicación no aparecen en el mapa. Gris: prospecto · Ámbar: interesado · Verde: cliente · Rojo: perdido.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-borde border-y border-borde bg-superficie">
          {filtrados.map(({ c, t }) => {
            const vencido = c.proxima_accion_fecha && c.proxima_accion_fecha < fechaDentroDe(0);
            return (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-fondo">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{c.nombre_negocio}</span>
                      {c.is_seed && <Demo />}
                    </p>
                    <p className="truncate text-sm text-suave">
                      {TEXTO_TIPO_NEGOCIO[c.tipo]}
                      {c.zona ? ` · ${c.zona}` : ""}
                      {esAdmin && c.comercial ? ` · ${c.comercial}` : ""}
                    </p>
                    <p className={cn("truncate text-xs", vencido ? "font-semibold text-red-600 dark:text-red-400" : "text-suave")}>
                      {c.proxima_accion_fecha
                        ? `${vencido ? "Vencido" : "Próximo"}: ${c.proxima_accion ?? "seguimiento"} · ${fecha(c.proxima_accion_fecha)}`
                        : `Última visita: ${fecha(c.ultima_visita_at)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <EtiquetaEstado estado={c.estado} />
                    <IconoTemperatura t={t} />
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-suave" aria-hidden />
                </Link>
              </li>
            );
          })}
          {filtrados.length === 0 && <li className="px-4 py-8 text-center text-sm text-suave">No hay clientes con estos filtros.</li>}
        </ul>
      )}

    </>
  );
}
