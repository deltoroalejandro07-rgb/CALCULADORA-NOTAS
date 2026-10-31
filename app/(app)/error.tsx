"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="flex flex-col items-center px-6 pt-20 text-center">
      <p className="text-4xl">😕</p>
      <h1 className="mt-2 text-xl font-semibold">Algo ha fallado en esta pantalla</h1>
      <p className="mt-1 text-sm text-suave">Si no tienes cobertura, espera a recuperarla. Tus visitas guardadas en el móvil no se pierden.</p>
      <button onClick={reset} className="mt-6 flex min-h-12 items-center gap-2 rounded-lg bg-marca px-5 font-semibold text-marca-texto">
        <RotateCcw className="h-5 w-5" aria-hidden /> Reintentar
      </button>
      <Link href="/hoy" className="mt-3 text-sm text-marca underline">
        Ir a Hoy
      </Link>
    </div>
  );
}
