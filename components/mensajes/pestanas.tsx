"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function Pestanas({ pestanas }: { pestanas: { id: string; titulo: string; contenido: React.ReactNode }[] }) {
  const inicial = useSearchParams().get("tab");
  const [activa, setActiva] = useState(pestanas.some((p) => p.id === inicial) ? inicial! : pestanas[0].id);
  return (
    <>
      <div role="tablist" className="mx-4 mb-3 grid grid-cols-2 rounded-xl border border-borde p-1">
        {pestanas.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={activa === p.id}
            onClick={() => setActiva(p.id)}
            className={cn("min-h-10 rounded-lg text-sm font-medium", activa === p.id ? "bg-marca text-marca-texto" : "text-suave")}
          >
            {p.titulo}
          </button>
        ))}
      </div>
      {pestanas.find((p) => p.id === activa)?.contenido}
    </>
  );
}
