"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button, Card } from "@/components/ui";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export function CardSetupForm({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardSetupFormInner />
    </Elements>
  );
}

function CardSetupFormInner() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(
        stripeError.message ?? "No hemos podido verificar tu tarjeta.",
      );
      setSubmitting(false);
      return;
    }

    if (setupIntent?.status === "succeeded") {
      await fetch("/api/stripe/confirm-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupIntentId: setupIntent.id }),
      });
      router.push("/onboarding/intake");
      return;
    }

    setError("No hemos podido verificar tu tarjeta.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <PaymentElement />
      </Card>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        Vincular tarjeta
      </Button>
    </form>
  );
}
