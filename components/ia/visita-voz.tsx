"use client";

import { Loader2, Mic, MicOff, Sparkles } from "lucide-react";
import { useState } from "react";
import { interpretarVisita } from "@/app/(app)/ia-acciones";
import { cn } from "@/lib/cn";
import type { DatosVisitaVoz } from "@/lib/ia/ia";
import { useDictado, useEnLinea } from "@/lib/navegador";

/**
 * «Dicta la visita»: el comercial habla al salir y la IA rellena resultado, tipo, interés, nota y
 * próxima acción. Sin IA (o sin cobertura) lo dictado va a la nota.
 */
export function VisitaPorVoz({ cliente, onDatos, onTexto }: { cliente: string | null; onDatos: (d: DatosVisitaVoz) => void; onTexto: (t: string) => void }) {
  const enLinea = useEnLinea();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [rellenando, setRellenando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const dictado = useDictado((t) => setTexto((x) => (x ? `${x} ${t}` : t)));

  async function rellenar() {
    setAviso(null);
    if (!enLinea) {
      onTexto(texto);
      setAviso({ ok: true, texto: "Sin cobertura: lo dictado se ha puesto en la nota. Completa el resultado a mano." });
      return;
    }
    setRellenando(true);
    const r = await interpretarVisita(texto, cliente);
    setRellenando(false);
    if (r.datos) {
      onDatos(r.datos);
      setAviso({ ok: true, texto: "✓ Visita rellenada. Revisa los campos de abajo y guarda." });
    } else {
      onTexto(texto);
      setAviso({ ok: false, texto: `${r.error ?? "No se ha podido interpretar."} Lo dictado se ha puesto en la nota.` });
    }
  }

  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          if (dictado.disponible && !dictado.escuchando) dictado.alternar();
        }}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-marca/50 bg-marca-suave px-4 text-sm font-semibold text-marca"
      >
        <Mic className="h-5 w-5" aria-hidden /> Dictar la visita y que se rellene sola
      </button>
    );

  return (
    <section className="space-y-2 rounded-xl border border-marca/30 bg-superficie p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-3">
        {dictado.disponible ? (
        <button
          type="button"
          onClick={dictado.alternar}
          aria-label={dictado.escuchando ? "Parar de dictar" : "Seguir dictando"}
          aria-pressed={dictado.escuchando}
          className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", dictado.escuchando ? "animate-pulse bg-red-600 text-white" : "bg-marca text-marca-texto")}
        >
          {dictado.escuchando ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        ) : null}
        <p className="text-sm text-suave">
          {!dictado.disponible ? "Pulsa el micrófono del teclado del móvil y cuenta la visita." : dictado.escuchando ? "Te escucho… cuenta con quién hablaste, qué le interesa y qué hay que hacer después." : "Pulsa el micro para seguir dictando, o escribe abajo."}
        </p>
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        aria-label="Lo que has dictado"
        placeholder="«He estado con Paco, el dueño. Le interesa la cerveza de barril y el agua con gas. Quiere oferta, vuelvo el jueves con muestras.»"
        className="w-full rounded-lg border border-borde bg-fondo/50 px-3 py-2 text-sm outline-none focus:border-marca"
      />
      {aviso && <p className={aviso.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-red-600"}>{aviso.texto}</p>}
      <button
        type="button"
        disabled={texto.trim().length < 5 || rellenando}
        onClick={() => {
          if (dictado.escuchando) dictado.alternar();
          void rellenar();
        }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-50"
      >
        {rellenando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {rellenando ? "Rellenando…" : "Rellenar la visita"}
      </button>
    </section>
  );
}
