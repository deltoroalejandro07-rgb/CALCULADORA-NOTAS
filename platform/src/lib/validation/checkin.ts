import { z } from "zod";

export const checkinSchema = z.object({
  trainingPlanId: z.string(),
  adherenceFeeling: z.enum(["GREAT", "OK_SKIPPED_SOME", "STRUGGLED"]),
  sessionsCompleted: z.enum(["ALMOST_ALL", "ABOUT_HALF", "FEW_OR_NONE"]),
  perceivedEffort: z.enum(["EASY", "JUST_RIGHT", "HARD", "TOO_MUCH"]),
  painReported: z.enum(["NONE", "MILD", "SEVERE"]),
  painLocation: z.string().trim().optional(),
  goalUnchanged: z.boolean(),
  newCategory: z.enum(["STRENGTH", "HYROX", "RUNNING"]).optional(),
  weeklyChangesNote: z.string().trim().optional(),
  competitionStatus: z.enum(["UNCHANGED", "CANCELLED", "CHANGED"]).optional(),
  newCompetitionDate: z.string().optional(),
  competitionResult: z.string().trim().optional(),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
