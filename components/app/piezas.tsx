import { Flame, Snowflake, ThermometerSun } from "lucide-react";
import { cn } from "@/lib/cn";
import { TEXTO_TEMPERATURA, type Temperatura } from "@/lib/dominio/temperatura";
import { TEXTO_ESTADO, type EstadoCliente } from "@/lib/dominio/tipos";

export function Cabecera({ titulo, subtitulo, logo, children }: { titulo: string; subtitulo?: string; logo?: boolean; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-6 lg:pb-6 lg:pt-10">
      <div className="min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src="/logo.svg" alt="dliverygo" width={318} height={103} className="mb-3 h-8 w-auto lg:hidden" />}
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-suave lg:text-[15px]">{subtitulo}</p>}
      </div>
      {children}
    </header>
  );
}

export function Cargando() {
  return (
    <div className="space-y-3 px-4 pt-6" aria-busy="true" aria-label="Cargando">
      <div className="h-7 w-40 animate-pulse rounded bg-borde" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-borde/60" />
      ))}
    </div>
  );
}

export function Tarjeta({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-borde bg-superficie p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>{children}</div>;
}

const COLOR_ESTADO: Record<EstadoCliente, string> = {
  prospecto: "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700",
  interesado: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/60",
  cliente: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60",
  perdido: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800/60",
};

export function EtiquetaEstado({ estado }: { estado: EstadoCliente }) {
  return <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", COLOR_ESTADO[estado])}>{TEXTO_ESTADO[estado]}</span>;
}

const TEMP = {
  caliente: { icono: Flame, clase: "text-orange-600 dark:text-orange-400" },
  templado: { icono: ThermometerSun, clase: "text-amber-500 dark:text-amber-300" },
  frio: { icono: Snowflake, clase: "text-sky-600 dark:text-sky-400" },
} as const;

export function IconoTemperatura({ t, conTexto }: { t: Temperatura; conTexto?: boolean }) {
  const { icono: Icono, clase } = TEMP[t];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", clase)} title={TEXTO_TEMPERATURA[t]}>
      <Icono className="h-4 w-4" aria-hidden />
      {conTexto ? TEXTO_TEMPERATURA[t] : <span className="sr-only">{TEXTO_TEMPERATURA[t]}</span>}
    </span>
  );
}

/** Marca visible de los datos de ejemplo (is_seed). */
export function Demo() {
  return (
    <span className="rounded border border-borde px-1 py-px text-[10px] font-medium uppercase tracking-wide text-suave">
      Demo
    </span>
  );
}

export function Proximamente({ paso, children }: { paso: number; children: React.ReactNode }) {
  return (
    <Tarjeta className="mx-4 border-dashed text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-marca">Paso {paso} del plan</p>
      <p className="mt-1 text-sm text-suave">{children}</p>
    </Tarjeta>
  );
}
