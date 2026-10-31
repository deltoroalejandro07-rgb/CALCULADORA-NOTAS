"use client";

import { AlarmClock, CalendarDays, ChevronRight, Flame, Navigation, Plus, Snowflake } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Demo } from "@/components/app/piezas";
import { cn } from "@/lib/cn";
import { enlaceRutaGoogle, longitudRuta, MAX_PARADAS_ENLACE, ordenarRuta } from "@/lib/dominio/ruta";
import { TEXTO_RESULTADO, TEXTO_TIPO_NEGOCIO, type EstadoCliente, type ResultadoVisita, type TipoNegocio } from "@/lib/dominio/tipos";
import { fechaDentroDe, textoDistancia } from "@/lib/dominio/visita";
import { diasNaturales, fecha } from "@/lib/formato";
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

const dias = (ahora: number, desde: string) => diasNaturales(desde, new Date(ahora));

function Fila({ c, detalle, rojo }: { c: ClienteHoy; detalle: string; rojo?: boolean }) {
  return (
    <li className="flex items-center gap-2 pr-3">
      <Link href={`/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 active:bg-fondo">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{c.nombre_negocio}</span>
            {c.is_seed && <Demo />}
          </p>
          <p className={cn("truncate text-xs", rojo ? "font-semibold text-red-600 dark:text-red-400" : "text-suave")}>{detalle}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-suave" aria-hidden />
      </Link>
      <Link href={`/visita/nueva?cliente=${c.id}`} aria-label={`Registrar visita a ${c.nombre_negocio}`} className="rounded-full bg-marca-suave p-2.5 text-marca">
        <Plus className="h-5 w-5" />
      </Link>
    </li>
  );
}

function Seccion({ titulo, icono: Icono, clase, filtro, total, children }: { titulo: string; icono: typeof Flame; clase: string; filtro: string; total: number; children: React.ReactNode }) {
  if (!total) return null;
  return (
    <section>
      <h2 className="mb-1 flex items-center gap-1.5 px-4 text-sm font-semibold uppercase tracking-wide text-suave">
        <Icono className={cn("h-4 w-4", clase)} aria-hidden /> {titulo} <span className="font-normal">({total})</span>
        {total > 5 && (
          <Link href={`/clientes?filtro=${filtro}`} className="ml-auto text-xs font-medium normal-case tracking-normal text-marca">
            Ver todos
          </Link>
        )}
      </h2>
      <ul className="divide-y divide-borde border-y border-borde bg-superficie">{children}</ul>
    </section>
  );
}

export function PanelHoy({ clientes }: { clientes: ClienteHoy[] }) {
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

  const tarjetas = [
    { texto: "Seguimientos vencidos", n: g.vencidos.length, icono: AlarmClock, clase: "text-red-600 dark:text-red-400", filtro: "vencidos" },
    { texto: "Seguimientos de hoy", n: g.deHoy.length, icono: CalendarDays, clase: "text-marca", filtro: "hoy" },
    { texto: "Oportunidades calientes", n: g.calientes.length, icono: Flame, clase: "text-orange-600 dark:text-orange-400", filtro: "calientes" },
    { texto: "Sin visitar +30 días", n: g.olvidados.length, icono: Snowflake, clase: "text-sky-600 dark:text-sky-400", filtro: "olvidados" },
  ];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 px-4">
        {tarjetas.map(({ texto, n, icono: Icono, clase, filtro }) => (
          <Link key={texto} href={`/clientes?filtro=${filtro}`} className="rounded-2xl border border-borde bg-superficie p-4 active:scale-[0.98]">
            <Icono className={`h-6 w-6 ${clase}`} aria-hidden />
            <p className="mt-2 text-3xl font-bold tabular-nums">{n}</p>
            <p className="text-sm leading-tight text-suave">{texto}</p>
          </Link>
        ))}
      </section>

      {ruta.length > 0 && (
        <section className="space-y-2 px-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-suave">
            <Navigation className="h-4 w-4 text-marca" aria-hidden /> Ruta del día
            <span className="font-normal normal-case tracking-normal">
              · {ruta.length} parada{ruta.length === 1 ? "" : "s"} · {textoDistancia(longitudRuta(ruta, pos))}
            </span>
          </h2>
          <ol className="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie text-sm">
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
          {enlace && (
            <a href={enlace} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marca font-semibold text-marca-texto">
              <Navigation className="h-5 w-5" aria-hidden /> Toda la ruta en Google Maps
              {ruta.length > MAX_PARADAS_ENLACE && <span className="text-xs font-normal">(primeras {MAX_PARADAS_ENLACE})</span>}
            </a>
          )}
        </section>
      )}

      <Seccion titulo="Vencidos" icono={AlarmClock} clase="text-red-600" filtro="vencidos" total={g.vencidos.length}>
        {g.vencidos.slice(0, 5).map((c) => (
          <Fila key={c.id} c={c} rojo detalle={`${c.proxima_accion ?? "Seguimiento"} · ${fecha(c.proxima_accion_fecha)} (hace ${dias(ahora, c.proxima_accion_fecha!)} d)`} />
        ))}
      </Seccion>

      <Seccion titulo="Para hoy" icono={CalendarDays} clase="text-marca" filtro="hoy" total={g.deHoy.length}>
        {g.deHoy.slice(0, 5).map((c) => (
          <Fila key={c.id} c={c} detalle={`${c.proxima_accion ?? "Seguimiento"}${c.horario_visita ? ` · ${c.horario_visita}` : ""}`} />
        ))}
      </Seccion>

      <Seccion titulo="Oportunidades calientes" icono={Flame} clase="text-orange-600" filtro="calientes" total={g.calientes.length}>
        {g.calientes.slice(0, 5).map((c) => (
          <Fila key={c.id} c={c} detalle={`${TEXTO_RESULTADO[c.ultimo_resultado!]} hace ${dias(ahora, c.ultimo_resultado_at!)} d · ${TEXTO_TIPO_NEGOCIO[c.tipo]}${c.zona ? `, ${c.zona}` : ""}`} />
        ))}
      </Seccion>

      <Seccion titulo="Sin visitar más de 30 días" icono={Snowflake} clase="text-sky-600" filtro="olvidados" total={g.olvidados.length}>
        {g.olvidados.slice(0, 5).map((c) => (
          <Fila key={c.id} c={c} detalle={c.ultima_visita_at ? `Última visita hace ${dias(ahora, c.ultima_visita_at)} días` : "Nunca visitado"} />
        ))}
      </Seccion>

      {!g.vencidos.length && !g.deHoy.length && !g.calientes.length && !g.olvidados.length && (
        <div className="mx-4 rounded-2xl border border-dashed border-borde p-6 text-center text-sm text-suave">
          {clientes.length ? "Todo al día. ¡Buen trabajo!" : "Aún no tienes clientes. Registra tu primera visita con el botón +."}
        </div>
      )}
    </div>
  );
}
