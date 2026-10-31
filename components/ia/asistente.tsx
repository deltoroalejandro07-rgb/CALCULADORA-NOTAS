"use client";

import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { preguntar } from "@/app/(app)/ia-acciones";
import { cn } from "@/lib/cn";
import type { TurnoChat } from "@/lib/ia/ia";

const EJEMPLOS = [
  "¿Qué clientes interesados llevan más de 3 semanas sin visita?",
  "¿Cuántas visitas ha hecho cada comercial esta semana?",
  "¿Qué entregas fallaron la semana pasada y por qué?",
  "¿Qué productos hemos repartido más este mes?",
  "¿Qué clientes están en riesgo y a quién le toca pedir?",
];

export function Asistente({ activa }: { activa: boolean }) {
  const [turnos, setTurnos] = useState<TurnoChat[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pensando, empezar] = useTransition();
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnos, pensando]);

  const enviar = (pregunta: string) => {
    const q = pregunta.trim();
    if (!q || pensando) return;
    const nuevos: TurnoChat[] = [...turnos, { rol: "usuario", texto: q }];
    setTurnos(nuevos);
    setTexto("");
    setError(null);
    empezar(async () => {
      const r = await preguntar(nuevos);
      if (r.texto) setTurnos([...nuevos, { rol: "ia", texto: r.texto }]);
      else {
        setError(r.error ?? "No se ha podido responder.");
        setTurnos(turnos); // se quita la pregunta para poder repetirla
        setTexto(q);
      }
    });
  };

  if (!activa)
    return (
      <div className="mx-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        <p className="font-semibold">Falta activar la IA</p>
        <p className="mt-1 text-suave">
          Añade la clave <code>ANTHROPIC_API_KEY</code> en Vercel (Settings → Environment Variables) y vuelve a publicar (Deployments → ⋯ → Redeploy). La clave se pega solo en Vercel.
        </p>
      </div>
    );

  return (
    <div className="flex min-h-[60dvh] flex-col px-4 pb-4">
      <div className="flex-1 space-y-3">
        {!turnos.length && (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-suave">Prueba con:</p>
            <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
              {EJEMPLOS.map((e) => (
                <button key={e} type="button" onClick={() => enviar(e)} className="rounded-lg border border-borde bg-superficie px-3 py-2.5 text-left text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-marca/40">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {turnos.map((t, i) => (
          <div key={i} className={cn("flex", t.rol === "usuario" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-sm leading-relaxed lg:max-w-[70%]",
                t.rol === "usuario" ? "bg-marca text-marca-texto" : "border border-borde bg-superficie shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
              )}
            >
              {t.rol === "ia" && (
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-marca">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> CRM
                </span>
              )}
              {t.texto}
            </div>
          </div>
        ))}
        {pensando && (
          <p className="flex items-center gap-2 text-sm text-suave" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando tus datos…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div ref={fin} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-4 flex items-end gap-2 rounded-xl border border-borde bg-superficie p-2 shadow-md lg:bottom-4"
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          rows={1}
          placeholder="Escribe tu pregunta…"
          aria-label="Tu pregunta"
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
        />
        <button type="submit" disabled={!texto.trim() || pensando} aria-label="Preguntar" className="flex h-10 w-10 items-center justify-center rounded-lg bg-marca text-marca-texto disabled:opacity-40">
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
      <p className="mt-2 text-center text-[11px] text-suave">La IA solo lee datos, no cambia nada. Revisa las cifras importantes.</p>
    </div>
  );
}
