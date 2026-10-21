import { Flame, Snowflake, ThermometerSun } from "lucide-react";
import { cn } from "@/lib/cn";
import { TEXTO_TEMPERATURA, type Temperatura } from "@/lib/dominio/temperatura";
import { TEXTO_ESTADO, type EstadoCliente } from "@/lib/dominio/tipos";

export function Cabecera({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pb-3 pt-6">
      <div>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
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
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-borde/60" />
      ))}
    </div>
  );
}

export function Tarjeta({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-borde bg-superficie p-4", className)}>{children}</div>;
}

const COLOR_ESTADO: Record<EstadoCliente, string> = {
  prospecto: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  interesado: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  cliente: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  perdido: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function EtiquetaEstado({ estado }: { estado: EstadoCliente }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", COLOR_ESTADO[estado])}>{TEXTO_ESTADO[estado]}</span>;
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
    <span className="rounded bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300">
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
