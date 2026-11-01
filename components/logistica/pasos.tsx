import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export const PASOS_REPARTO = [
  { n: 1, texto: "Albaranes", ruta: "/logistica/albaranes" },
  { n: 2, texto: "Calcular ruta", ruta: "/logistica/planificar" },
  { n: 3, texto: "Rutas y PDF", ruta: "/logistica" },
] as const;

/** Barra de los 3 pasos del reparto: siempre se ve en qué paso estás y se puede saltar a otro. */
export function PasosReparto({ actual, fecha, hechos = [] }: { actual: 1 | 2 | 3; fecha?: string; hechos?: number[] }) {
  return (
    <nav aria-label="Pasos del reparto" className="px-4 pb-4">
      <ol className="flex items-center gap-1 rounded-xl border border-borde bg-superficie p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {PASOS_REPARTO.map((p, i) => {
          const activo = p.n === actual;
          const hecho = hechos.includes(p.n) && !activo;
          return (
            <li key={p.n} className="flex min-w-0 flex-1 items-center gap-1">
              <Link
                href={fecha ? `${p.ruta}?fecha=${fecha}` : p.ruta}
                aria-current={activo ? "step" : undefined}
                className={cn(
                  "flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm transition",
                  activo ? "bg-marca font-semibold text-marca-texto" : "text-suave hover:bg-fondo hover:text-texto",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    activo ? "bg-marca-texto text-marca" : hecho ? "bg-marca text-marca-texto" : "border border-borde",
                  )}
                >
                  {hecho ? <Check className="h-3 w-3" strokeWidth={3} /> : p.n}
                </span>
                <span className="truncate">{p.texto}</span>
              </Link>
              {i < PASOS_REPARTO.length - 1 && <span className="hidden h-px w-3 shrink-0 bg-borde sm:block" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const nombre = (f: string) => {
  const t = new Date(f + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Día fijo del reparto, con enlace para volver a «Preparar reparto» y cambiarlo allí. */
export function BarraDia({ fecha }: { fecha: string }) {
  return (
    <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-lg bg-marca-suave px-3 py-2 text-sm">
      <span>
        Reparto del <strong>{nombre(fecha)}</strong>
      </span>
      <Link href={`/logistica?fecha=${fecha}`} className="shrink-0 font-medium text-marca underline underline-offset-2">
        Volver al reparto
      </Link>
    </div>
  );
}
