import { Card, Chip, Field, Input } from "@/components/ui";
import { IntakeDraft, showsMedicalNotice } from "../types";

export function HealthStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <>
      <Field label="¿Cuánto llevas entrenando?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["NEVER", "Nunca o casi nunca"],
              ["IRREGULAR", "Algo, pero irregular"],
              ["REGULAR", "Entreno regularmente"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.trainingHistory === value}
              onClick={() => update({ trainingHistory: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Alguna molestia o lesión a tener en cuenta?">
        <div className="flex gap-2">
          <Chip
            selected={!draft.injuryHas}
            onClick={() => update({ injuryHas: false, injuryNotes: "" })}
          >
            No
          </Chip>
          <Chip selected={draft.injuryHas} onClick={() => update({ injuryHas: true })}>
            Sí
          </Chip>
        </div>
        {draft.injuryHas && (
          <Input
            value={draft.injuryNotes}
            onChange={(e) => update({ injuryNotes: e.target.value })}
            placeholder="Rodilla, espalda, hombro..."
            className="mt-2"
          />
        )}
      </Field>

      <Field label="¿Tienes alguna condición de salud que debamos conocer?">
        <div className="flex flex-col gap-2">
          <Chip
            selected={draft.heartOrBp}
            onClick={() => update({ heartOrBp: !draft.heartOrBp })}
            className="justify-start"
          >
            Problemas de corazón o tensión alta
          </Chip>
          <Chip
            selected={draft.pregnancy}
            onClick={() => update({ pregnancy: !draft.pregnancy })}
            className="justify-start"
          >
            Embarazo
          </Chip>
          <Chip
            selected={draft.recentSurgery}
            onClick={() => update({ recentSurgery: !draft.recentSurgery })}
            className="justify-start"
          >
            Cirugía reciente
          </Chip>
        </div>
      </Field>

      {showsMedicalNotice(draft) && (
        <Card className="border-accent-blue bg-accent-blue/10">
          <p className="text-sm text-primary">
            Te recomendamos consultar con un médico antes de empezar. Vamos a
            preparar un plan más conservador para ti.
          </p>
        </Card>
      )}
    </>
  );
}

export function isHealthStepValid(draft: IntakeDraft) {
  return draft.trainingHistory !== "";
}
