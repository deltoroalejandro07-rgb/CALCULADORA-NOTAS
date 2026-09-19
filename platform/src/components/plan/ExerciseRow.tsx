import { TrainingPlanOutput } from "@/lib/ai/schema";

type Exercise =
  TrainingPlanOutput["weeks"][number]["days"][number]["sessions"][number]["exercises"][number];

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const details = [
    exercise.sets && exercise.reps
      ? `${exercise.sets} x ${exercise.reps}`
      : (exercise.reps ?? null),
    exercise.load,
    exercise.restSeconds ? `descanso ${exercise.restSeconds}s` : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-0.5 py-3 border-b border-line last:border-0">
      <span className="text-sm font-medium text-primary">
        {exercise.name}
      </span>
      {details.length > 0 && (
        <span className="text-sm text-secondary">{details.join(" · ")}</span>
      )}
      {exercise.notes && (
        <span className="text-xs text-secondary">{exercise.notes}</span>
      )}
    </li>
  );
}
