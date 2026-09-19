import { db } from "@/lib/db";
import { TrainingPlanOutput } from "@/lib/ai/schema";

export async function getLatestPlan(userId: string) {
  const plan = await db.trainingPlan.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });

  if (!plan) return null;

  return {
    ...plan,
    data: plan.planJson as unknown as TrainingPlanOutput,
  };
}

export const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const DAY_NAMES_SHORT = ["L", "M", "X", "J", "V", "S", "D"] as const;

/** Assumes the plan's first week starts on the Monday on/after it was generated. */
export function getCurrentPlanPosition(generatedAt: Date) {
  const anchor = new Date(generatedAt);
  const dayOffset = (anchor.getDay() + 6) % 7; // 0 = Monday
  anchor.setDate(anchor.getDate() - dayOffset);
  anchor.setHours(0, 0, 0, 0);

  const daysSince = Math.floor(
    (Date.now() - anchor.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (daysSince < 0 || daysSince >= 28) return null;

  return {
    week: Math.floor(daysSince / 7) + 1,
    day: (daysSince % 7) + 1,
  };
}
