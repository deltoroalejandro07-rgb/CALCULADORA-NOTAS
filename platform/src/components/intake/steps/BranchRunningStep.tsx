import { Chip, Field, Input } from "@/components/ui";
import { IntakeDraft } from "../types";

export function BranchRunningStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <>
      <Field label="Distancia">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["5K", "5k"],
              ["10K", "10k"],
              ["HALF", "Media"],
              ["MARATHON", "Maratón"],
              ["UNKNOWN", "Aún no lo sé"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.distance === value}
              onClick={() => update({ distance: value })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Tienes fecha de carrera?">
        <div className="flex gap-2">
          <Chip
            selected={draft.hasRaceDate}
            onClick={() => update({ hasRaceDate: true })}
          >
            Sí
          </Chip>
          <Chip
            selected={!draft.hasRaceDate}
            onClick={() => update({ hasRaceDate: false })}
          >
            No todavía
          </Chip>
        </div>
        {draft.hasRaceDate && (
          <Input
            type="date"
            value={draft.raceDate}
            onChange={(e) => update({ raceDate: e.target.value })}
            className="mt-2"
          />
        )}
      </Field>

      <Field label="¿Cuál es tu meta?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["FINISH", "Solo terminarla"],
              ["IMPROVE_TIME", "Mejorar mi tiempo"],
              ["START_FROM_ZERO", "Empezar desde cero"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.goal === value}
              onClick={() => update({ goal: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Cuánto sueles correr ahora a la semana?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["NONE", "Nada"],
              ["LITTLE_1_5", "Poco (1-5km)"],
              ["SOME_5_15", "Algo (5-15km)"],
              ["A_LOT_15_PLUS", "Bastante (15km+)"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.currentWeeklyKm === value}
              onClick={() => update({ currentWeeklyKm: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>
    </>
  );
}

export function isBranchRunningValid(draft: IntakeDraft) {
  return (
    draft.distance !== "" &&
    draft.goal !== "" &&
    draft.currentWeeklyKm !== "" &&
    (!draft.hasRaceDate || draft.raceDate !== "")
  );
}
