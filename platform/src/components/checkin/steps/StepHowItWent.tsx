import { Chip, Field } from "@/components/ui";
import { CheckinDraft } from "../types";

export function StepHowItWent({
  draft,
  update,
}: {
  draft: CheckinDraft;
  update: (patch: Partial<CheckinDraft>) => void;
}) {
  return (
    <>
      <Field label="¿Cómo te ha ido este mes?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["GREAT", "Genial, seguí el plan casi al completo"],
              ["OK_SKIPPED_SOME", "Bien, pero me salté algunos días"],
              ["STRUGGLED", "Me costó bastante seguirlo"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.adherenceFeeling === value}
              onClick={() => update({ adherenceFeeling: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Cuántos entrenamientos hiciste de los planeados?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["ALMOST_ALL", "Casi todos"],
              ["ABOUT_HALF", "La mitad"],
              ["FEW_OR_NONE", "Pocos o ninguno"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.sessionsCompleted === value}
              onClick={() => update({ sessionsCompleted: value })}
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

export function isStepHowItWentValid(draft: CheckinDraft) {
  return draft.adherenceFeeling !== "" && draft.sessionsCompleted !== "";
}
