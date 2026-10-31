"use client";

import { Copy, MessageCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";
import { redactarSeguimiento } from "@/app/(app)/ia-acciones";
import { Boton } from "@/components/ui/boton";
import { enlaceWhatsApp } from "@/lib/dominio/contacto";

/** Botón «Redactar seguimiento»: la IA escribe el WhatsApp según lo hablado en las visitas; se revisa antes de enviar. */
export function MensajeSeguimiento({ clienteId, telefono }: { clienteId: string; telefono: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [intencion, setIntencion] = useState("");
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const redactar = () =>
    empezar(async () => {
      setAviso(null);
      const r = await redactarSeguimiento(clienteId, intencion);
      if (r.error) setAviso(r.error);
      else {
        setTexto(r.texto ?? "");
        if (!r.conIA) setAviso("Mensaje de plantilla: con la IA activada se redacta a medida según las visitas.");
      }
    });

  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          redactar();
        }}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-marca/30 bg-marca-suave text-sm font-semibold text-marca"
      >
        <Sparkles className="h-4 w-4" aria-hidden /> Redactar WhatsApp de seguimiento
      </button>
    );

  return (
    <section className="space-y-2 rounded-xl border border-marca/30 bg-superficie p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-marca">
          <Sparkles className="h-4 w-4" aria-hidden /> Mensaje de seguimiento
        </p>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="rounded-md p-1 text-suave hover:bg-fondo">
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="block text-xs text-suave">
        ¿Qué quieres conseguir? (opcional)
        <input
          value={intencion}
          onChange={(e) => setIntencion(e.target.value)}
          placeholder="Que me reciba el jueves para probar el vermut"
          className="mt-1 min-h-10 w-full rounded-lg border border-borde bg-superficie px-3 text-sm text-texto outline-none focus:border-marca"
        />
      </label>
      <textarea
        value={pendiente && !texto ? "Redactando…" : texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        aria-label="Texto del mensaje"
        disabled={pendiente}
        className="w-full rounded-lg border border-borde bg-fondo/50 px-3 py-2 text-sm outline-none focus:border-marca disabled:opacity-60"
      />
      {aviso && <p className="text-xs text-suave">{aviso}</p>}
      <div className="flex flex-wrap gap-2">
        <Boton type="button" variante="secundario" onClick={redactar} cargando={pendiente} className="min-h-10 px-3 text-sm">
          <RefreshCw className="h-4 w-4" aria-hidden /> Otra versión
        </Boton>
        <Boton
          type="button"
          variante="secundario"
          disabled={!texto}
          onClick={() => {
            void navigator.clipboard?.writeText(texto);
            setAviso("Copiado.");
          }}
          className="min-h-10 px-3 text-sm"
        >
          <Copy className="h-4 w-4" aria-hidden /> Copiar
        </Boton>
        {telefono && texto && (
          <a href={enlaceWhatsApp(telefono, texto)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-marca px-3 text-sm font-semibold text-marca-texto">
            <MessageCircle className="h-4 w-4" aria-hidden /> Abrir en WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}
