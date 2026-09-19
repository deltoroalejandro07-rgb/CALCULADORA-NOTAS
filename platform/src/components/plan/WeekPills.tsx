import Link from "next/link";
import clsx from "clsx";

export function WeekPills({
  totalWeeks,
  activeWeek,
}: {
  totalWeeks: number;
  activeWeek: number;
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
        <Link
          key={week}
          href={`/plan/${week}`}
          className={clsx(
            "min-h-11 px-4 inline-flex items-center rounded-pill border text-sm font-medium transition-colors",
            week === activeWeek
              ? "border-accent-blue bg-accent-blue/10 text-primary"
              : "border-line bg-surface text-secondary hover:text-primary",
          )}
        >
          Semana {week}
        </Link>
      ))}
    </div>
  );
}
