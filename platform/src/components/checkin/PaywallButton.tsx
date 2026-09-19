"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function PaywallButton({ checkinId }: { checkinId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/plans/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error generando el plan");
      router.push("/plan");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No hemos podido generar tu plan.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={handleClick} disabled={submitting} className="w-full">
        {submitting ? "Generando tu plan..." : "Pagar y generar mi plan"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
