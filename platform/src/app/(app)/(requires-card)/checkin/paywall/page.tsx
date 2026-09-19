import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { REPORT_PRICE_CENTS, REPORT_PRICE_CURRENCY } from "@/lib/stripe";
import { Card } from "@/components/ui";
import { PaywallButton } from "@/components/checkin/PaywallButton";

export default async function CheckinPaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ checkinId?: string }>;
}) {
  const { checkinId } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  if (!checkinId) redirect("/checkin");

  const checkin = await db.checkin.findFirst({
    where: { id: checkinId, userId },
  });
  if (!checkin) redirect("/checkin");

  const existingPlan = await db.trainingPlan.findUnique({
    where: { checkinId },
  });
  if (existingPlan) redirect("/plan");

  const price = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: REPORT_PRICE_CURRENCY,
  }).format(REPORT_PRICE_CENTS / 100);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Tu plan ajustado ya casi está</h1>
          <p className="text-sm text-secondary">
            Hemos tenido en cuenta cómo te fue este mes. Genera tu plan
            ajustado por {price}, cobrado a la tarjeta que ya tienes
            vinculada.
          </p>
        </div>
        <PaywallButton checkinId={checkinId} />
      </Card>
    </main>
  );
}
