import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, REPORT_PRICE_CENTS, REPORT_PRICE_CURRENCY } from "@/lib/stripe";
import { generateTrainingPlan } from "@/lib/ai/generatePlan";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  const { checkinId } = await request.json();
  if (typeof checkinId !== "string") {
    return NextResponse.json({ error: "Falta checkinId" }, { status: 400 });
  }

  const checkin = await db.checkin.findFirst({
    where: { id: checkinId, userId },
  });
  if (!checkin) {
    return NextResponse.json({ error: "Check-in no encontrado" }, { status: 404 });
  }

  const existingPlan = await db.trainingPlan.findUnique({
    where: { checkinId: checkin.id },
  });
  if (existingPlan) {
    return NextResponse.json({ planId: existingPlan.id });
  }

  const [user, stripeCustomer, previousPlan, goal] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.stripeCustomer.findUnique({ where: { userId } }),
    db.trainingPlan.findUnique({
      where: { id: checkin.trainingPlanId },
      include: { intakeForm: true },
    }),
    db.goal.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!previousPlan || !goal) {
    return NextResponse.json(
      { error: "No se encontró el plan o el objetivo del usuario" },
      { status: 404 },
    );
  }

  if (
    !stripeCustomer ||
    stripeCustomer.cardStatus !== "AUTHORIZED" ||
    !stripeCustomer.stripePaymentMethodId
  ) {
    return NextResponse.json(
      { error: "No tienes una tarjeta vinculada" },
      { status: 400 },
    );
  }

  const payment = await db.payment.create({
    data: {
      userId,
      amountCents: REPORT_PRICE_CENTS,
      currency: REPORT_PRICE_CURRENCY,
      status: "PENDING",
    },
  });

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: REPORT_PRICE_CENTS,
      currency: REPORT_PRICE_CURRENCY,
      customer: stripeCustomer.stripeCustomerId,
      payment_method: stripeCustomer.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      metadata: { userId, checkinId },
    });
  } catch (err) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    const message =
      err instanceof Stripe.errors.StripeCardError
        ? "Tu tarjeta ha sido rechazada. Actualízala e inténtalo de nuevo."
        : "No hemos podido procesar el pago.";
    return NextResponse.json({ error: message }, { status: 402 });
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
      status: paymentIntent.status === "succeeded" ? "SUCCEEDED" : "PENDING",
    },
  });

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      {
        error:
          "El pago necesita confirmación adicional de tu banco. Actualiza tu tarjeta e inténtalo de nuevo.",
      },
      { status: 402 },
    );
  }

  try {
    const { plan, weeksToCompetition, model } = await generateTrainingPlan({
      user,
      intakeForm: previousPlan.intakeForm,
      goal,
      monthNumber: previousPlan.monthNumber + 1,
      previousPlan,
      checkin,
    });

    const trainingPlan = await db.trainingPlan.create({
      data: {
        userId,
        goalId: goal.id,
        intakeFormId: previousPlan.intakeFormId,
        checkinId: checkin.id,
        monthNumber: previousPlan.monthNumber + 1,
        isFree: false,
        planJson: plan,
        weeksToCompetition,
        aiModel: model,
      },
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { trainingPlanId: trainingPlan.id },
    });

    return NextResponse.json({ planId: trainingPlan.id });
  } catch (err) {
    // We already charged the card - refund since no plan was produced.
    await stripe.refunds.create({ payment_intent: paymentIntent.id });
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    console.error("Plan generation failed after payment, refunded", err);
    return NextResponse.json(
      {
        error:
          "No hemos podido generar tu plan. Se ha anulado el cobro - inténtalo de nuevo.",
      },
      { status: 500 },
    );
  }
}
