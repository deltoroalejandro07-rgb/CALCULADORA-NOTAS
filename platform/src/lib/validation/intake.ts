import { z } from "zod";

const commonFields = {
  name: z.string().trim().min(1, "Cuéntanos cómo te llamas"),
  age: z.coerce.number().int().min(12).max(100),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  weightKg: z.coerce.number().min(30).max(300),
  heightCm: z.coerce.number().min(100).max(250),
  trainingHistory: z.enum(["NEVER", "IRREGULAR", "REGULAR"]),
  injuryHas: z.boolean(),
  injuryNotes: z.string().trim().optional(),
  heartOrBp: z.boolean(),
  pregnancy: z.boolean(),
  recentSurgery: z.boolean(),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  sessionDuration: z.enum(["15_30", "30_45", "45_60", "60_PLUS"]),
  equipment: z.enum(["FULL_GYM", "BASIC_HOME", "BODYWEIGHT"]),
  motivation: z.string().trim().optional(),
  notifyReminders: z.boolean(),
};

const strengthSchema = z.object({
  category: z.literal("STRENGTH"),
  ...commonFields,
  primaryGoal: z.enum(["LOSE_FAT", "GAIN_MUSCLE", "BOTH", "FEEL_BETTER"]),
  avoid: z.string().trim().optional(),
  include: z.string().trim().optional(),
});

const hyroxSchema = z.object({
  category: z.literal("HYROX"),
  ...commonFields,
  hasCompetitionDate: z.boolean(),
  competitionDate: z.string().optional(),
  isFirstCompetition: z.boolean().optional(),
  runningFeeling: z.enum(["GOOD", "NORMAL", "HARDEST"]),
  strengthFeeling: z.enum(["GOOD", "NORMAL", "HARDEST"]),
});

const runningSchema = z.object({
  category: z.literal("RUNNING"),
  ...commonFields,
  distance: z.enum(["5K", "10K", "HALF", "MARATHON", "UNKNOWN"]),
  hasRaceDate: z.boolean(),
  raceDate: z.string().optional(),
  goal: z.enum(["FINISH", "IMPROVE_TIME", "START_FROM_ZERO"]),
  currentWeeklyKm: z.enum([
    "NONE",
    "LITTLE_1_5",
    "SOME_5_15",
    "A_LOT_15_PLUS",
  ]),
});

export const intakeSchema = z.discriminatedUnion("category", [
  strengthSchema,
  hyroxSchema,
  runningSchema,
]);

export type IntakeInput = z.infer<typeof intakeSchema>;

export function requiresMedicalNotice(
  answers: Pick<IntakeInput, "heartOrBp" | "pregnancy" | "recentSurgery">,
) {
  return answers.heartOrBp || answers.pregnancy || answers.recentSurgery;
}
