import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLatestPlan, getCurrentPlanPosition } from "@/lib/plans";

export default async function PlanIndexPage() {
  const session = await auth();
  const userId = session!.user.id;

  const plan = await getLatestPlan(userId);
  if (!plan) redirect("/onboarding/intake");

  const current = getCurrentPlanPosition(plan.generatedAt);
  redirect(`/plan/${current?.week ?? 1}`);
}
