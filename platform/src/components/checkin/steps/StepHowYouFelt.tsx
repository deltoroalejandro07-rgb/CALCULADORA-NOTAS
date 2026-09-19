import { Chip, Field, Input } from "@/components/ui";
import { CheckinDraft } from "../types";

export function StepHowYouFelt({
  draft,
  update,
}: {
  draft: CheckinDraft;
  update: (patch: Partial<CheckinDraft>) => void;
}) {
  return (
    <>
      <Field label="¿Cómo sentiste el esfuerzo en general?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["EASY", "Suave, podría más"],
              ["JUST_RIGHT", "Justo como esperaba"],
              ["HARD", "Duro, al límite"],
              ["TOO_MUCH", "Demasiado, no pude seguirlo"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.perceivedEffort === value}
              onClick={() => update({ perceivedEffort: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Notaste alguna molestia o dolor?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["NONE", "No, todo bien"],
              ["MILD", "Sí, algo leve"],
              ["SEVERE", "Sí, bastante"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.painReported === value}
              onClick={() => update({ painReported: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
        {(draft.painReported === "MILD" || draft.painReported === "SEVERE") && (
          <Input
            value={draft.painLocation}
            onChange={(e) => update({ painLocation: e.target.value })}
            placeholder="¿Dónde? Espalda, rodilla, hombro..."
            className="mt-2"
          />
        )}
      </Field>
    </>
  );
}

export function isStepHowYouFeltValid(draft: CheckinDraft) {
  if (draft.perceivedEffort === "" || draft.painReported === "") return false;
  if (
    (draft.painReported === "MILD" || draft.painReported === "SEVERE") &&
    draft.painLocation.trim() === ""
  ) {
    return false;
  }
  return true;
}
