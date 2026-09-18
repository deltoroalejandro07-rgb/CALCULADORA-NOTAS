import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { TrainingPlanOutput } from "@/lib/ai/schema";

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default async function PlanPage() {
  const session = await auth();
  const userId = session!.user.id;

  const plan = await db.trainingPlan.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });

  if (!plan) {
    redirect("/onboarding/intake");
  }

  const data = plan.planJson as unknown as TrainingPlanOutput;

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tu plan de este mes</h1>
        {plan.weeksToCompetition !== null && (
          <p className="text-sm text-secondary">
            Faltan {plan.weeksToCompetition} semanas para tu competición.
          </p>
        )}
        {data.taperNote && (
          <p className="text-sm text-accent-blue">{data.taperNote}</p>
        )}
      </div>

      {data.weeks.map((week) => (
        <Card key={week.weekNumber} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Semana {week.weekNumber} — {week.focus}
            </h2>
            {week.isDeload && (
              <span className="text-xs text-accent-green rounded-pill border border-accent-green px-3 py-1">
                Descarga
              </span>
            )}
          </div>
          <p className="text-sm text-secondary">{week.coachNote}</p>

          <div className="flex flex-col gap-3">
            {week.days.map((day) => (
              <div
                key={day.dayOfWeek}
                className="border border-line rounded-xl p-3"
              >
                <p className="text-sm font-medium mb-2">
                  {DAY_NAMES[day.dayOfWeek - 1]}
                </p>
                {day.isRestDay || day.sessions.length === 0 ? (
                  <p className="text-sm text-secondary">Descanso</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {day.sessions.map((session, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium text-accent-blue mb-1">
                          {session.title}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {session.exercises.map((ex, j) => (
                            <li key={j} className="text-sm text-secondary">
                              {ex.name}
                              {ex.sets && ` — ${ex.sets}x`}
                              {ex.reps && `${ex.reps}`}
                              {ex.load && ` (${ex.load})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </main>
  );
}
