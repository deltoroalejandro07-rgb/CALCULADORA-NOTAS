import { Chip, Field, Input } from "@/components/ui";
import { IntakeDraft } from "../types";

export function BranchHyroxStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <>
      <Field label="¿Tienes fecha de competición?">
        <div className="flex gap-2">
          <Chip
            selected={draft.hasCompetitionDate}
            onClick={() => update({ hasCompetitionDate: true })}
          >
            Sí
          </Chip>
          <Chip
            selected={!draft.hasCompetitionDate}
            onClick={() => update({ hasCompetitionDate: false })}
          >
            No todavía
          </Chip>
        </div>
        {draft.hasCompetitionDate && (
          <div className="flex flex-col gap-3 mt-3">
            <Input
              type="date"
              value={draft.competitionDate}
              onChange={(e) => update({ competitionDate: e.target.value })}
            />
            <Field label="¿Es tu primera vez?">
              <div className="flex gap-2">
                <Chip
                  selected={draft.isFirstCompetition}
                  onClick={() => update({ isFirstCompetition: true })}
                >
                  Sí
                </Chip>
                <Chip
                  selected={!draft.isFirstCompetition}
                  onClick={() => update({ isFirstCompetition: false })}
                >
                  No
                </Chip>
              </div>
            </Field>
          </div>
        )}
      </Field>

      <Field label="¿Cómo te sientes corriendo?">
        <div className="flex gap-2">
          {(
            [
              ["GOOD", "Bien"],
              ["NORMAL", "Normal"],
              ["HARDEST", "Lo que más me cuesta"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.runningFeeling === value}
              onClick={() => update({ runningFeeling: value })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Y con ejercicios de fuerza (cargar peso, empujar, etc.)?">
        <div className="flex gap-2">
          {(
            [
              ["GOOD", "Bien"],
              ["NORMAL", "Normal"],
              ["HARDEST", "Lo que más me cuesta"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.strengthFeeling === value}
              onClick={() => update({ strengthFeeling: value })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>
    </>
  );
}

export function isBranchHyroxValid(draft: IntakeDraft) {
  return (
    draft.runningFeeling !== "" &&
    draft.strengthFeeling !== "" &&
    (!draft.hasCompetitionDate || draft.competitionDate !== "")
  );
}
