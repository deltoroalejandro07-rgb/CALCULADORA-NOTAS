"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { TEXTO_TIPO_FOTO, TIPOS_FOTO, type TipoFoto } from "@/lib/dominio/visita";
import { comprimirFoto } from "@/lib/navegador";

export interface FotoBorrador {
  id: string;
  tipo: TipoFoto;
  blob: Blob;
  /** URL local para la miniatura (se libera al quitar la foto). */
  url: string;
}

function Miniatura({ foto, onTipo, onQuitar }: { foto: FotoBorrador; onTipo: (t: TipoFoto) => void; onQuitar: () => void }) {
  return (
    <div className="relative w-28 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.url} alt="" className="h-28 w-28 rounded-xl object-cover" />
      <button
        type="button"
        onClick={onQuitar}
        aria-label="Quitar foto"
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <select
        value={foto.tipo}
        onChange={(e) => onTipo(e.target.value as TipoFoto)}
        aria-label="Tipo de foto"
        className="mt-1 w-full rounded-lg border border-borde bg-superficie px-1 py-1.5 text-xs"
      >
        {TIPOS_FOTO.map((t) => (
          <option key={t} value={t}>
            {TEXTO_TIPO_FOTO[t]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Fotos({ fotos, onCambio }: { fotos: FotoBorrador[]; onCambio: (f: FotoBorrador[]) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anadir(ficheros: FileList | null) {
    if (!ficheros?.length) return;
    setProcesando(true);
    setError(null);
    try {
      const nuevas: FotoBorrador[] = [];
      for (const f of Array.from(ficheros)) {
        // Por orden: la 1.ª suele ser el escaparate, la 2.ª la barra
        const tipo = TIPOS_FOTO[Math.min(fotos.length + nuevas.length, 1)] ?? "otra";
        const blob = await comprimirFoto(f);
        nuevas.push({ id: crypto.randomUUID(), tipo, blob, url: URL.createObjectURL(blob) });
      }
      onCambio([...fotos, ...nuevas]);
    } catch {
      setError("No se ha podido procesar la foto.");
    } finally {
      setProcesando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {fotos.map((f) => (
          <Miniatura
            key={f.id}
            foto={f}
            onTipo={(tipo) => onCambio(fotos.map((x) => (x.id === f.id ? { ...x, tipo } : x)))}
            onQuitar={() => {
              URL.revokeObjectURL(f.url);
              onCambio(fotos.filter((x) => x.id !== f.id));
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={procesando}
          className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-borde text-sm text-suave"
        >
          {procesando ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden /> : <Camera className="h-7 w-7" aria-hidden />}
          {fotos.length ? "Otra foto" : "Hacer foto"}
        </button>
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        aria-label="Hacer foto"
        onChange={(e) => anadir(e.target.files)}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
