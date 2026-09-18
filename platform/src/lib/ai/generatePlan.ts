import type {
  Checkin,
  Goal,
  IntakeForm,
  TrainingCategory,
  TrainingPlan,
  User,
} from "@prisma/client";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./client";
import { TrainingPlanOutputSchema, TrainingPlanOutput } from "./schema";
import { COMMON_PROMPT } from "./prompts/common";
import { STRENGTH_PROMPT } from "./prompts/strength";
import { HYROX_PROMPT } from "./prompts/hyrox";
import { RUNNING_PROMPT } from "./prompts/running";
import { ADJUSTMENTS_PROMPT } from "./prompts/adjustments";

const MODEL = "claude-opus-5";

const CATEGORY_PROMPTS: Record<TrainingCategory, string> = {
  STRENGTH: STRENGTH_PROMPT,
  HYROX: HYROX_PROMPT,
  RUNNING: RUNNING_PROMPT,
};

export async function generateTrainingPlan(params: {
  user: User;
  intakeForm: IntakeForm;
  goal: Goal;
  monthNumber: number;
  previousPlan?: TrainingPlan | null;
  checkin?: Checkin | null;
}) {
  const { user, intakeForm, goal, monthNumber, previousPlan, checkin } =
    params;

  const systemBlocks = [
    { type: "text" as const, text: COMMON_PROMPT },
    { type: "text" as const, text: CATEGORY_PROMPTS[intakeForm.category] },
  ];
  if (checkin && previousPlan) {
    systemBlocks.push({ type: "text" as const, text: ADJUSTMENTS_PROMPT });
  }
  // Cache the whole stable prefix (identical for every user of this category
  // and adjustment state), so only the user payload below is billed fresh.
  const lastBlock = systemBlocks[systemBlocks.length - 1];
  const cachedSystemBlocks = [
    ...systemBlocks.slice(0, -1),
    { ...lastBlock, cache_control: { type: "ephemeral" as const } },
  ];

  const weeksToCompetition = computeWeeksToCompetition(goal.competitionDate);

  const userPayload = {
    usuario: {
      edad: user.age,
      sexo: user.sex,
      peso_kg: user.weightKg ? Number(user.weightKg) : null,
      altura_cm: user.heightCm ? Number(user.heightCm) : null,
    },
    contexto: {
      nivel: intakeForm.trainingHistory,
      dias_semana: intakeForm.daysPerWeek,
      duracion_sesion: intakeForm.sessionDuration,
      equipamiento: intakeForm.equipment,
      lesiones: intakeForm.injuries,
      aviso_medico_requerido: intakeForm.requiresMedicalNotice,
    },
    objetivo: {
      categoria: goal.category,
      sub_objetivo: goal.subGoal,
      distancia: goal.distance,
      fecha_competicion: goal.competitionDate
        ? goal.competitionDate.toISOString().slice(0, 10)
        : null,
      es_primera_vez: goal.isFirstCompetition,
      semanas_hasta_competicion: weeksToCompetition,
    },
    respuestas_especificas: intakeForm.categoryAnswers,
    plan_anterior: previousPlan ? summarizePlan(previousPlan) : null,
    checkin: checkin
      ? {
          adherencia: checkin.adherenceFeeling,
          sesiones_completadas: checkin.sessionsCompleted,
          esfuerzo: checkin.perceivedEffort,
          dolor: checkin.painReported,
          dolor_zona: checkin.painLocation,
          objetivo_cambia: !checkin.goalUnchanged,
          notas_semana: checkin.weeklyChangesNote,
        }
      : null,
    fecha_hoy: new Date().toISOString().slice(0, 10),
    mes_del_plan: monthNumber,
  };

  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: cachedSystemBlocks,
    messages: [{ role: "user", content: JSON.stringify(userPayload) }],
    output_config: {
      format: zodOutputFormat(TrainingPlanOutputSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("La IA no devolvió un plan válido");
  }

  return {
    plan: response.parsed_output,
    weeksToCompetition,
    model: response.model,
  };
}

function computeWeeksToCompetition(date: Date | null) {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}

function summarizePlan(plan: TrainingPlan) {
  const data = plan.planJson as unknown as TrainingPlanOutput;
  return {
    semanas: data.weeks.map((w) => ({
      numero: w.weekNumber,
      foco: w.focus,
      descarga: w.isDeload,
    })),
  };
}
