import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CheckinWizard } from "@/components/checkin/CheckinWizard";

export default async function CheckinPage() {
  const session = await auth();
  const userId = session!.user.id;

  const plan = await db.trainingPlan.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
    include: { goal: true },
  });

  if (!plan) redirect("/onboarding/intake");

  return (
    <CheckinWizard
      trainingPlanId={plan.id}
      hasCompetition={plan.goal.competitionDate !== null}
    />
  );
}
