import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSetupIntentForUser } from "@/lib/stripe";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  const setupIntent = await createSetupIntentForUser(user.id, user.email);

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
