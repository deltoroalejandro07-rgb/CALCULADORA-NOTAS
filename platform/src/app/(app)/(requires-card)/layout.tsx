import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function RequiresCardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const stripeCustomer = await db.stripeCustomer.findUnique({
    where: { userId: session!.user.id },
  });

  if (stripeCustomer?.cardStatus !== "AUTHORIZED") {
    redirect("/onboarding/tarjeta");
  }

  return children;
}
