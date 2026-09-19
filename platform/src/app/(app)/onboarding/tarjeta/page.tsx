import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSetupIntentForUser } from "@/lib/stripe";
import { CardSetupForm } from "@/components/billing/CardSetupForm";

export default async function TarjetaPage() {
  const session = await auth();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session!.user.id },
  });

  const setupIntent = await createSetupIntentForUser(user.id, user.email);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold">Vincula tu tarjeta</h1>
          <p className="text-sm text-secondary">
            Solo la verificamos, no se te cobra nada ahora. Tu primer plan
            del mes es gratis — solo se te cobrará si decides generar un
            plan ajustado tras tu check-in mensual.
          </p>
        </div>
        <CardSetupForm clientSecret={setupIntent.client_secret!} />
      </div>
    </main>
  );
}
