import { Chip, Field, Input, OptionCard } from "@/components/ui";
import { CheckinDraft } from "../types";

const CATEGORIES = [
  { value: "STRENGTH", title: "Ponerme en forma / ganar músculo" },
  { value: "HYROX", title: "Hyrox / reto híbrido" },
  { value: "RUNNING", title: "Prepararme para correr" },
] as const;

export function StepGoal({
  draft,
  update,
  hasCompetition,
}: {
  draft: CheckinDraft;
  update: (patch: Partial<CheckinDraft>) => void;
  hasCompetition: boolean;
}) {
  return (
    <>
      <Field label="¿Tu objetivo sigue siendo el mismo?">
        <div className="flex gap-2">
          <Chip
            selected={draft.goalUnchanged === true}
            onClick={() => update({ goalUnchanged: true, newCategory: "" })}
          >
            Sí, seguimos igual
          </Chip>
          <Chip
            selected={draft.goalUnchanged === false}
            onClick={() => update({ goalUnchanged: false })}
          >
            Quiero cambiarlo
          </Chip>
        </div>
      </Field>

      {draft.goalUnchanged === false && (
        <Field label="¿Cuál es tu nuevo objetivo?">
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((c) => (
              <OptionCard
                key={c.value}
                title={c.title}
                selected={draft.newCategory === c.value}
                onClick={() => update({ newCategory: c.value })}
              />
            ))}
          </div>
        </Field>
      )}

      <Field label="¿Algo cambió en tu semana a semana?" hint="Opcional">
        <Input
          value={draft.weeklyChangesNote}
          onChange={(e) => update({ weeklyChangesNote: e.target.value })}
          placeholder="Menos tiempo, más tiempo, lesión, viaje..."
        />
      </Field>

      {hasCompetition && (
        <Field label="¿Sigue en pie tu fecha de competición?">
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={draft.competitionStatus === "UNCHANGED"}
              onClick={() => update({ competitionStatus: "UNCHANGED" })}
            >
              Sí
            </Chip>
            <Chip
              selected={draft.competitionStatus === "CANCELLED"}
              onClick={() => update({ competitionStatus: "CANCELLED" })}
            >
              No
            </Chip>
            <Chip
              selected={draft.competitionStatus === "CHANGED"}
              onClick={() => update({ competitionStatus: "CHANGED" })}
            >
              Cambió
            </Chip>
          </div>
          {draft.competitionStatus === "CHANGED" && (
            <Input
              type="date"
              value={draft.newCompetitionDate}
              onChange={(e) =>
                update({ newCompetitionDate: e.target.value })
              }
              className="mt-2"
            />
          )}
          <Input
            value={draft.competitionResult}
            onChange={(e) => update({ competitionResult: e.target.value })}
            placeholder="¿Ya competiste? Cuéntanos el resultado (opcional)"
            className="mt-2"
          />
        </Field>
      )}
    </>
  );
}

export function isStepGoalValid(draft: CheckinDraft, hasCompetition: boolean) {
  if (draft.goalUnchanged === null) return false;
  if (draft.goalUnchanged === false && draft.newCategory === "") return false;
  if (hasCompetition && draft.competitionStatus === "") return false;
  if (
    hasCompetition &&
    draft.competitionStatus === "CHANGED" &&
    draft.newCompetitionDate === ""
  ) {
    return false;
  }
  return true;
}
