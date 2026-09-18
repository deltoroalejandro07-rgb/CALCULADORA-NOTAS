import { Chip, Field, Input } from "@/components/ui";
import { IntakeDraft } from "../types";

const DAYS = ["1", "2", "3", "4", "5", "6", "7"];

export function LogisticsStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <>
      <Field label="¿Cuántos días a la semana puedes entrenar?">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <Chip
              key={d}
              selected={draft.daysPerWeek === d}
              onClick={() => update({ daysPerWeek: d })}
            >
              {d}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Cuánto tiempo tienes normalmente por sesión?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["15_30", "15-30 min"],
              ["30_45", "30-45 min"],
              ["45_60", "45-60 min"],
              ["60_PLUS", "Más de 1 hora"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.sessionDuration === value}
              onClick={() => update({ sessionDuration: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="¿Dónde vas a entrenar?">
        <div className="flex flex-col gap-2">
          {(
            [
              ["FULL_GYM", "Gimnasio completo"],
              ["BASIC_HOME", "Básico o en casa"],
              ["BODYWEIGHT", "Solo cuerpo, sin material"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.equipment === value}
              onClick={() => update({ equipment: value })}
              className="justify-start"
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field
        label="¿Qué te ha hecho decidir empezar ahora?"
        hint="Opcional"
      >
        <Input
          value={draft.motivation}
          onChange={(e) => update({ motivation: e.target.value })}
          placeholder="Salud, verme mejor, más energía..."
        />
      </Field>

      <Field label="¿Quieres que te avisemos cuando toque entrenar?">
        <div className="flex gap-2">
          <Chip
            selected={draft.notifyReminders}
            onClick={() => update({ notifyReminders: true })}
          >
            Sí
          </Chip>
          <Chip
            selected={!draft.notifyReminders}
            onClick={() => update({ notifyReminders: false })}
          >
            No
          </Chip>
        </div>
      </Field>
    </>
  );
}

export function isLogisticsStepValid(draft: IntakeDraft) {
  return (
    draft.daysPerWeek !== "" &&
    draft.sessionDuration !== "" &&
    draft.equipment !== ""
  );
}
