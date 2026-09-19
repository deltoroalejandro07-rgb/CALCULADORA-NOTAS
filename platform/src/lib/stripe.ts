import Stripe from "stripe";
import { db } from "@/lib/db";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-08-26.dahlia",
});

export const REPORT_PRICE_CENTS = Number(
  process.env.REPORT_PRICE_CENTS ?? 900,
);
export const REPORT_PRICE_CURRENCY = "eur";

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
) {
  const existing = await db.stripeCustomer.findUnique({ where: { userId } });
  if (existing) return existing;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return db.stripeCustomer.create({
    data: { userId, stripeCustomerId: customer.id },
  });
}

/**
 * A SetupIntent saves a card for later off-session charges without
 * charging it now - the correct Stripe primitive for a "$0 authorization"
 * card link (Stripe doesn't support real $0 PaymentIntents).
 */
export async function createSetupIntentForUser(userId: string, email: string) {
  const stripeCustomer = await getOrCreateStripeCustomer(userId, email);

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomer.stripeCustomerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return setupIntent;
}
