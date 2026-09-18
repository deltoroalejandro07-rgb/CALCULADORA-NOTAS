import { Chip, Field, Input } from "@/components/ui";
import { IntakeDraft } from "../types";

export function BranchStrengthStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <>
      <Field label="¿Qué buscas principalmente?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["LOSE_FAT", "Perder grasa"],
              ["GAIN_MUSCLE", "Ganar músculo"],
              ["BOTH", "Ambas"],
              ["FEEL_BETTER", "Sentirme mejor y más fuerte"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.primaryGoal === value}
              onClick={() => update({ primaryGoal: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Algo que prefieras evitar" hint="Opcional">
        <Input
          value={draft.avoid}
          onChange={(e) => update({ avoid: e.target.value })}
          placeholder="Ej: sentadillas por la rodilla"
        />
      </Field>

      <Field label="Algo que te guste e incluir sí o sí" hint="Opcional">
        <Input
          value={draft.include}
          onChange={(e) => update({ include: e.target.value })}
          placeholder="Ej: press banca"
        />
      </Field>
    </>
  );
}

export function isBranchStrengthValid(draft: IntakeDraft) {
  return draft.primaryGoal !== "";
}
