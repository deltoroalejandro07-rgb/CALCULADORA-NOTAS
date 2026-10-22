import type { Metadata } from "next";
import { Suspense } from "react";
import { Confirmar } from "./confirmar";

export const metadata: Metadata = { title: "Entrando…" };

export default function PaginaConfirmar() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 text-center text-suave">
      <Suspense fallback={<p>Entrando…</p>}>
        <Confirmar />
      </Suspense>
    </main>
  );
}
