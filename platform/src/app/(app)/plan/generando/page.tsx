"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export default function PlanGenerandoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/plans/generate", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error generando el plan");
        if (!cancelled) router.push("/plan");
      } catch {
        if (!cancelled) {
          setError(
            "No hemos podido generar tu plan. Puedes intentarlo de nuevo.",
          );
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm flex flex-col gap-3 text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold">Algo salió mal</h1>
            <p className="text-sm text-secondary">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Creando tu plan</h1>
            <p className="text-sm text-secondary">
              Estamos preparando tu primer plan de entrenamiento con IA.
              Puede tardar hasta un minuto.
            </p>
          </>
        )}
      </Card>
    </main>
  );
}
