import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLatestPlan, getCurrentPlanPosition } from "@/lib/plans";
import { Card, ProgressBar } from "@/components/ui";
import { WeekPills } from "@/components/plan/WeekPills";
import { DayCard } from "@/components/plan/DayCard";

export default async function PlanWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week: weekParam } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const plan = await getLatestPlan(userId);
  if (!plan) redirect("/onboarding/intake");

  const weekNumber = Number(weekParam);
  const week = plan.data.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) notFound();

  const current = getCurrentPlanPosition(plan.generatedAt);

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Tu plan de este mes</h1>
        {plan.weeksToCompetition !== null && (
          <p className="text-sm text-secondary">
            Faltan {plan.weeksToCompetition} semanas para tu competición.
          </p>
        )}
        <ProgressBar value={(weekNumber / plan.data.weeks.length) * 100} />
      </div>

      <WeekPills totalWeeks={plan.data.weeks.length} activeWeek={weekNumber} />

      <Card className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{week.focus}</h2>
          {week.isDeload && (
            <span className="text-xs text-accent-green rounded-pill border border-accent-green px-3 py-1 shrink-0">
              Descarga
            </span>
          )}
        </div>
        <p className="text-sm text-secondary">{week.coachNote}</p>
        {plan.data.taperNote && week.isDeload && (
          <p className="text-sm text-accent-blue mt-2">
            {plan.data.taperNote}
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {week.days.map((day) => (
          <DayCard
            key={day.dayOfWeek}
            day={day}
            week={weekNumber}
            isToday={
              current?.week === weekNumber && current?.day === day.dayOfWeek
            }
          />
        ))}
      </div>
    </main>
  );
}
