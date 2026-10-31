"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { leerFotoCliente } from "@/app/(app)/ia-acciones";
import type { DatosFotoCliente } from "@/lib/ia/ia";

/** Reduce la foto en el móvil (máx. 1600 px, JPEG) para que suba rápido. */
async function reducir(f: File): Promise<string> {
  const img = await createImageBitmap(f);
  const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala);
  c.height = Math.round(img.height * escala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

/** «Rellenar con una foto»: la IA lee una tarjeta de visita o la fachada y rellena la ficha. */
export function FotoCliente({ onDatos }: { onDatos: (d: DatosFotoCliente) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function elegida(f: File | undefined) {
    if (!f) return;
    setAviso(null);
    setLeyendo(true);
    try {
      const r = await leerFotoCliente(await reducir(f));
      if (r.datos) {
        onDatos(r.datos);
        const n = Object.values(r.datos).filter(Boolean).length;
        setAviso(n ? { ok: true, texto: `✓ ${n} datos leídos de la foto. Revísalos y guarda.` } : { ok: false, texto: "No se han encontrado datos en la foto. Prueba con otra más cerca y con luz." });
      } else setAviso({ ok: false, texto: r.error ?? "No se ha podido leer la foto." });
    } catch {
      setAviso({ ok: false, texto: "No se ha podido leer la foto." });
    } finally {
      setLeyendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input ref={entrada} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Foto de la tarjeta o la fachada" onChange={(e) => elegida(e.target.files?.[0])} />
      <button
        type="button"
        disabled={leyendo}
        onClick={() => entrada.current?.click()}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-marca/50 bg-marca-suave px-4 text-sm font-semibold text-marca disabled:opacity-70"
      >
        {leyendo ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Camera className="h-5 w-5" aria-hidden />}
        {leyendo ? "Leyendo la foto…" : "Rellenar con una foto (tarjeta de visita o fachada)"}
      </button>
      {aviso && (
        <p role="status" className={aviso.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-red-600"}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
