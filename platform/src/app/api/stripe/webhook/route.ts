import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  switch (event.type) {
    case "setup_intent.succeeded": {
      const setupIntent = event.data.object;
      const customerId =
        typeof setupIntent.customer === "string"
          ? setupIntent.customer
          : setupIntent.customer?.id;
      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;

      if (customerId && paymentMethodId) {
        await db.stripeCustomer.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripePaymentMethodId: paymentMethodId,
            cardStatus: "AUTHORIZED",
            authorizedAt: new Date(),
          },
        });
      }
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      await db.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: "SUCCEEDED" },
      });
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      await db.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: "FAILED" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
