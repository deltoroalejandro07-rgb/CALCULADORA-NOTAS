"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { generarResumen } from "@/app/(app)/ia-acciones";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";

/** Resumen del día o de la semana, escrito por la IA a partir de las cifras. */
export function ResumenIA() {
  const [periodo, setPeriodo] = useState<"hoy" | "semana">("semana");
  const [r, setR] = useState<{ texto?: string; conIA?: boolean; error?: string } | null>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <section className="rounded-xl border border-marca/30 bg-superficie p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="h-4 w-4 text-marca" aria-hidden /> Resumen automático
        </h2>
        <div className="flex gap-2">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-borde p-0.5 text-sm" role="radiogroup" aria-label="Periodo">
            {(["hoy", "semana"] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={periodo === p} onClick={() => setPeriodo(p)} className={cn("rounded-md px-3 py-1", periodo === p ? "bg-marca-suave font-medium text-marca" : "text-suave")}>
                {p === "hoy" ? "Hoy" : "Semana"}
              </button>
            ))}
          </div>
          <Boton type="button" cargando={pendiente} onClick={() => empezar(async () => setR(await generarResumen(periodo)))} className="min-h-9 px-3 text-sm">
            {r ? "Actualizar" : "Generar"}
          </Boton>
        </div>
      </div>
      {!r && !pendiente && <p className="mt-2 text-sm text-suave">Visitas de cada comercial, reparto, clientes en riesgo y en qué fijarte, en un minuto de lectura.</p>}
      {pendiente && <p className="mt-3 text-sm text-suave">Preparando el resumen…</p>}
      {r?.error && <p className="mt-3 text-sm text-red-600">{r.error}</p>}
      {r?.texto && !pendiente && <div className="mt-3 whitespace-pre-line text-sm leading-relaxed">{r.texto}</div>}
      {r?.texto && r.conIA === false && <p className="mt-2 text-xs text-suave">Resumen solo con cifras: con la IA activada se escribe con conclusiones y acciones.</p>}
    </section>
  );
}
