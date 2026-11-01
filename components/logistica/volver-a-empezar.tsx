"use client";

import { RotateCcw } from "lucide-react";
import { startTransition, useActionState } from "react";
import { deshacerRepartoDia, type EstadoForm } from "@/app/(app)/logistica/acciones";
import { Boton } from "@/components/ui/boton";
import { VaciarAlbaranes } from "./albaranes";

/** «¿Te has equivocado?»: deshacer las rutas del día (sin perder los albaranes) o borrar todo. */
export function VolverAEmpezar({ fecha, rutas, textoDia }: { fecha: string; rutas: number; textoDia: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(deshacerRepartoDia, {});
  return (
    <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div>
        <h2 className="font-semibold">¿Te has equivocado?</h2>
        <p className="text-sm text-suave">Puedes deshacer y volver a empezar.</p>
      </div>
      {rutas > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirm(`¿Deshacer ${rutas === 1 ? "la ruta" : `las ${rutas} rutas`} de ${textoDia}? Se borran también las entregas marcadas. Los albaranes NO se borran: vuelven a «por repartir» para calcular otra vez.`)) return;
            const f = new FormData(e.currentTarget);
            startTransition(() => accion(f));
          }}
          className="space-y-1.5"
        >
          <input type="hidden" name="fecha" value={fecha} />
          <Boton type="submit" variante="secundario" cargando={pendiente} className="w-full text-sm">
            <RotateCcw className="h-4 w-4" aria-hidden /> Deshacer {rutas === 1 ? "la ruta" : "las rutas"} de {textoDia} (los albaranes se quedan)
          </Boton>
        </form>
      )}
      {estado.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
      <VaciarAlbaranes />
    </section>
  );
}
