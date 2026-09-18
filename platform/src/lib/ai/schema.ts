import { z } from "zod";

export const ExerciseSchema = z.object({
  name: z.string().describe("Nombre del ejercicio, en español, lenguaje simple"),
  sets: z.number().int().min(1).max(10).optional(),
  reps: z
    .string()
    .optional()
    .describe('Repeticiones o duración, ej. "8-10", "30 seg", "5 km"'),
  load: z
    .string()
    .optional()
    .describe('Peso o ritmo en lenguaje simple, ej. "peso corporal", "moderado", "ritmo suave"'),
  restSeconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().optional(),
});

export const SessionSchema = z.object({
  title: z.string().describe('Ej. "Piernas", "Tirada larga", "Estación Hyrox"'),
  exercises: z.array(ExerciseSchema).min(1),
});

export const DaySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7).describe("1 = lunes ... 7 = domingo"),
  isRestDay: z.boolean(),
  sessions: z.array(SessionSchema),
});

export const WeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(4),
  focus: z.string().describe('Ej. "Construcción de volumen", "Descarga", "Taper"'),
  isDeload: z.boolean(),
  days: z.array(DaySchema).length(7),
  coachNote: z
    .string()
    .describe("1-3 frases simples y cercanas explicando el por qué de esta semana"),
});

export const TrainingPlanOutputSchema = z.object({
  weeks: z.array(WeekSchema).length(4),
  taperNote: z
    .string()
    .nullable()
    .describe("Explicación del taper si hay competición cerca, si no null"),
});

export type TrainingPlanOutput = z.infer<typeof TrainingPlanOutputSchema>;
