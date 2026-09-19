import Link from "next/link";
import clsx from "clsx";
import { ChevronRightIcon, MoonIcon } from "@/components/ui";
import { DAY_NAMES } from "@/lib/plans";
import { TrainingPlanOutput } from "@/lib/ai/schema";

type Day = TrainingPlanOutput["weeks"][number]["days"][number];

export function DayCard({
  day,
  week,
  isToday,
}: {
  day: Day;
  week: number;
  isToday?: boolean;
}) {
  const isRest = day.isRestDay || day.sessions.length === 0;

  return (
    <Link
      href={`/plan/${week}/${day.dayOfWeek}`}
      className={clsx(
        "flex items-center gap-3 min-h-11 p-4 rounded-card border bg-surface transition-colors",
        isToday
          ? "border-accent-blue"
          : "border-line hover:border-line-cool",
      )}
    >
      <span
        className={clsx(
          "w-2 h-2 rounded-full shrink-0",
          isRest ? "bg-secondary" : "bg-accent-green",
        )}
        aria-hidden
      />
      <span className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-primary">
          {DAY_NAMES[day.dayOfWeek - 1]}
        </span>
        {isRest ? (
          <span className="text-sm text-secondary inline-flex items-center gap-1">
            <MoonIcon className="w-3.5 h-3.5" />
            Descanso
          </span>
        ) : (
          <span className="text-sm text-secondary truncate">
            {day.sessions.map((s) => s.title).join(" · ")}
          </span>
        )}
      </span>
      <ChevronRightIcon className="w-4 h-4 text-secondary shrink-0" />
    </Link>
  );
}
