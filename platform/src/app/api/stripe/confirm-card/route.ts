import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { setupIntentId } = await request.json();
  if (typeof setupIntentId !== "string") {
    return NextResponse.json({ error: "Falta setupIntentId" }, { status: 400 });
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== "succeeded" || !setupIntent.payment_method) {
    return NextResponse.json(
      { error: "La tarjeta no se ha podido verificar" },
      { status: 400 },
    );
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method.id;

  await db.stripeCustomer.update({
    where: { userId: session.user.id },
    data: {
      stripePaymentMethodId: paymentMethodId,
      cardStatus: "AUTHORIZED",
      authorizedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
