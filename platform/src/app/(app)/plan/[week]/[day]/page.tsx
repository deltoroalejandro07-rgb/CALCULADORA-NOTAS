import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLatestPlan, DAY_NAMES } from "@/lib/plans";
import { Card, ChevronLeftIcon, MoonIcon } from "@/components/ui";
import { ExerciseRow } from "@/components/plan/ExerciseRow";

export default async function PlanDayPage({
  params,
}: {
  params: Promise<{ week: string; day: string }>;
}) {
  const { week: weekParam, day: dayParam } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const plan = await getLatestPlan(userId);
  if (!plan) redirect("/onboarding/intake");

  const weekNumber = Number(weekParam);
  const dayNumber = Number(dayParam);
  const week = plan.data.weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayOfWeek === dayNumber);
  if (!week || !day) notFound();

  const isRest = day.isRestDay || day.sessions.length === 0;

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <Link
        href={`/plan/${weekNumber}`}
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary min-h-11 w-fit"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Semana {weekNumber}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {DAY_NAMES[day.dayOfWeek - 1]}
        </h1>
        <p className="text-sm text-secondary">{week.focus}</p>
      </div>

      {isRest ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <MoonIcon className="w-6 h-6 text-secondary" />
          <p className="text-primary font-medium">Día de descanso</p>
          <p className="text-sm text-secondary">
            Aprovecha para recuperar. Mañana seguimos.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {day.sessions.map((sess, i) => (
            <Card key={i} className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-accent-blue">
                {sess.title}
              </h2>
              <ul>
                {sess.exercises.map((ex, j) => (
                  <ExerciseRow key={j} exercise={ex} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
