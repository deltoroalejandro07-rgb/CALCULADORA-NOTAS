import { Chip, Field, Input } from "@/components/ui";
import { IntakeDraft } from "../types";

export function PersonalStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <>
      <Field label="¿Cómo te llamas?">
        <Input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Tu nombre"
        />
      </Field>
      <Field label="Edad">
        <Input
          type="number"
          value={draft.age}
          onChange={(e) => update({ age: e.target.value })}
          placeholder="30"
        />
      </Field>
      <Field label="Sexo">
        <div className="flex gap-2">
          {(
            [
              ["MALE", "Hombre"],
              ["FEMALE", "Mujer"],
              ["OTHER", "Otro"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.sex === value}
              onClick={() => update({ sex: value })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Peso (kg)">
          <Input
            type="number"
            value={draft.weightKg}
            onChange={(e) => update({ weightKg: e.target.value })}
            placeholder="70"
          />
        </Field>
        <Field label="Altura (cm)">
          <Input
            type="number"
            value={draft.heightCm}
            onChange={(e) => update({ heightCm: e.target.value })}
            placeholder="170"
          />
        </Field>
      </div>
    </>
  );
}

export function isPersonalStepValid(draft: IntakeDraft) {
  return (
    draft.name.trim().length > 0 &&
    draft.age !== "" &&
    draft.sex !== "" &&
    draft.weightKg !== "" &&
    draft.heightCm !== ""
  );
}
