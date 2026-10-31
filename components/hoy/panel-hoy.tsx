"use client";

import { AlarmClock, CalendarDays, ChevronRight, Flame, Navigation, Phone, Plus, Snowflake, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Demo } from "@/components/app/piezas";
import { sugerirVisitas } from "@/lib/dominio/sugerencias";
import { enlaceRutaGoogle, longitudRuta, MAX_PARADAS_ENLACE, ordenarRuta } from "@/lib/dominio/ruta";
import { type EstadoCliente, type ResultadoVisita, type TipoNegocio } from "@/lib/dominio/tipos";
import { fechaDentroDe, textoDistancia } from "@/lib/dominio/visita";
import { useUbicacion } from "@/lib/navegador";

interface ClienteHoy {
  id: string;
  nombre_negocio: string;
  tipo: TipoNegocio;
  zona: string | null;
  direccion: string | null;
  estado: EstadoCliente;
  telefono: string | null;
  lat: number | null;
  lng: number | null;
  ultimo_resultado: ResultadoVisita | null;
  ultimo_resultado_at: string | null;
  ultima_visita_at: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  horario_visita: string | null;
  is_seed: boolean;
}


export function PanelHoy({ clientes, extra }: { clientes: ClienteHoy[]; /** Bloques que van tras las cifras (agenda, sugerencias…). */ extra?: React.ReactNode }) {
  const { pos } = useUbicacion();
  const [ahora] = useState(() => Date.now());
  const hoy = fechaDentroDe(0, new Date(ahora));

  const g = useMemo(() => {
    const hace = (n: number) => new Date(ahora - n * 86_400_000).toISOString();
    return {
      vencidos: clientes.filter((c) => c.proxima_accion_fecha && c.proxima_accion_fecha < hoy).sort((a, b) => a.proxima_accion_fecha!.localeCompare(b.proxima_accion_fecha!)),
      deHoy: clientes.filter((c) => c.proxima_accion_fecha === hoy),
      calientes: clientes
        .filter((c) => (c.ultimo_resultado === "pide_oferta" || c.ultimo_resultado === "interesado") && c.ultimo_resultado_at && c.ultimo_resultado_at >= hace(14))
        .sort((a, b) => b.ultimo_resultado_at!.localeCompare(a.ultimo_resultado_at!)),
      olvidados: clientes.filter((c) => !c.ultima_visita_at || c.ultima_visita_at < hace(30)).sort((a, b) => (a.ultima_visita_at ?? "").localeCompare(b.ultima_visita_at ?? "")),
    };
  }, [clientes, hoy, ahora]);

  // Ruta del día: seguimientos de hoy y vencidos con ubicación, ordenados desde donde estás
  const ruta = useMemo(() => {
    const paradas = [...g.vencidos, ...g.deHoy].filter((c) => c.lat != null && c.lng != null).map((c) => ({ ...c, lat: c.lat!, lng: c.lng! }));
    return ordenarRuta(paradas, pos);
  }, [g, pos]);
  const enlace = enlaceRutaGoogle(ruta);
  const sugeridas = useMemo(() => sugerirVisitas(clientes, hoy, pos), [clientes, hoy, pos]);

  const tarjetas = [
    { texto: "Seguimientos vencidos", n: g.vencidos.length, icono: AlarmClock, clase: "text-red-600 dark:text-red-400", filtro: "vencidos" },
    { texto: "Seguimientos de hoy", n: g.deHoy.length, icono: CalendarDays, clase: "text-marca", filtro: "hoy" },
    { texto: "Oportunidades calientes", n: g.calientes.length, icono: Flame, clase: "text-orange-600 dark:text-orange-400", filtro: "calientes" },
    { texto: "Sin visitar +30 días", n: g.olvidados.length, icono: Snowflake, clase: "text-sky-600 dark:text-sky-400", filtro: "olvidados" },
  ];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4">
        {tarjetas.map(({ texto, n, icono: Icono, clase, filtro }) => (
          <Link
            key={texto}
            href={`/clientes?filtro=${filtro}`}
            className="group rounded-xl border border-borde bg-superficie p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-marca/40 hover:shadow-md active:scale-[0.98] lg:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-medium leading-tight text-suave">{texto}</p>
              <Icono className={`h-5 w-5 shrink-0 ${clase}`} aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums lg:text-3xl">{n}</p>
          </Link>
        ))}
      </section>

      <section className="px-4">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-suave">
            <Sparkles className="h-4 w-4 text-marca" aria-hidden /> ¿A quién visito hoy?
          </h2>
          {!sugeridas.length && (
            <p className="rounded-xl border border-dashed border-borde px-3 py-3 text-sm text-suave">
              {clientes.length ? "Todo al día: no hay visitas urgentes. ¡Buen trabajo!" : "Aún no tienes clientes. Registra tu primera visita con el botón +."}
            </p>
          )}
          <ol className="grid gap-2">
            {sugeridas.map(({ cliente: c, motivos }, i) => (
              <li key={c.id} className="flex items-start gap-3 rounded-xl border border-borde bg-superficie p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-suave text-xs font-bold text-marca">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/clientes/${c.id}`} className="flex items-center gap-2 font-medium hover:text-marca">
                    <span className="truncate">{c.nombre_negocio}</span>
                    {c.is_seed && <Demo />}
                  </Link>
                  <p className="text-sm text-texto/80">{motivos[0]}</p>
                  {motivos.length > 1 && <p className="text-xs text-suave">{motivos.slice(1).join(" · ")}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Link href={`/visita/nueva?cliente=${c.id}`} className="inline-flex items-center gap-1 rounded-md bg-marca px-2.5 py-1.5 text-xs font-semibold text-marca-texto">
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Visita
                    </Link>
                    {c.lat != null && c.lng != null && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-borde px-2.5 py-1.5 text-xs font-medium">
                        <Navigation className="h-3.5 w-3.5" aria-hidden /> Ir
                      </a>
                    )}
                    {c.telefono && (
                      <a href={`tel:${c.telefono}`} className="inline-flex items-center gap-1 rounded-md border border-borde px-2.5 py-1.5 text-xs font-medium">
                        <Phone className="h-3.5 w-3.5" aria-hidden /> Llamar
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
          <div className="space-y-2">{extra}</div>
        </div>
      </section>

      {ruta.length > 0 && (
        <section className="space-y-2 px-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-suave">
            <Navigation className="h-4 w-4 text-marca" aria-hidden /> Ruta de visitas
            <span className="font-normal">
              · {ruta.length} parada{ruta.length === 1 ? "" : "s"} · {textoDistancia(longitudRuta(ruta, pos))}
            </span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {enlace && (
              <a href={enlace} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 bg-marca text-sm font-semibold text-marca-texto hover:brightness-110">
                <Navigation className="h-4 w-4" aria-hidden /> Toda la ruta en Google Maps
                {ruta.length > MAX_PARADAS_ENLACE && <span className="text-xs font-normal">(primeras {MAX_PARADAS_ENLACE})</span>}
              </a>
            )}
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium">
                Ver las paradas en orden
                <ChevronRight className="h-4 w-4 text-suave transition group-open:rotate-90" aria-hidden />
              </summary>
              <ol className="divide-y divide-borde border-t border-borde text-sm">
                {ruta.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca text-xs font-bold text-marca-texto">{i + 1}</span>
                    <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.nombre_negocio}</span>
                      <span className="block truncate text-xs text-suave">{[c.horario_visita, c.direccion ?? c.zona].filter(Boolean).join(" · ")}</span>
                    </Link>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir ${c.nombre_negocio} en Google Maps`}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-marca-suave px-2.5 py-2 text-xs font-semibold text-marca"
                    >
                      <Navigation className="h-4 w-4" aria-hidden /> Ir
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </section>
      )}
    </div>
  );
}
