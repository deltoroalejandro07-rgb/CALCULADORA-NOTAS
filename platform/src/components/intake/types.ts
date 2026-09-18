export type Category = "STRENGTH" | "HYROX" | "RUNNING";

export interface IntakeDraft {
  // Datos personales
  name: string;
  age: string;
  sex: "MALE" | "FEMALE" | "OTHER" | "";
  weightKg: string;
  heightCm: string;

  // Experiencia y salud
  trainingHistory: "NEVER" | "IRREGULAR" | "REGULAR" | "";
  injuryHas: boolean;
  injuryNotes: string;
  heartOrBp: boolean;
  pregnancy: boolean;
  recentSurgery: boolean;

  // Logística
  daysPerWeek: string;
  sessionDuration: "15_30" | "30_45" | "45_60" | "60_PLUS" | "";
  equipment: "FULL_GYM" | "BASIC_HOME" | "BODYWEIGHT" | "";
  motivation: string;
  notifyReminders: boolean;

  // Objetivo
  category: Category | "";

  // Rama: pesas
  primaryGoal: "LOSE_FAT" | "GAIN_MUSCLE" | "BOTH" | "FEEL_BETTER" | "";
  avoid: string;
  include: string;

  // Rama: hyrox
  hasCompetitionDate: boolean;
  competitionDate: string;
  isFirstCompetition: boolean;
  runningFeeling: "GOOD" | "NORMAL" | "HARDEST" | "";
  strengthFeeling: "GOOD" | "NORMAL" | "HARDEST" | "";

  // Rama: running
  distance: "5K" | "10K" | "HALF" | "MARATHON" | "UNKNOWN" | "";
  hasRaceDate: boolean;
  raceDate: string;
  goal: "FINISH" | "IMPROVE_TIME" | "START_FROM_ZERO" | "";
  currentWeeklyKm:
    | "NONE"
    | "LITTLE_1_5"
    | "SOME_5_15"
    | "A_LOT_15_PLUS"
    | "";
}

export const emptyDraft: IntakeDraft = {
  name: "",
  age: "",
  sex: "",
  weightKg: "",
  heightCm: "",
  trainingHistory: "",
  injuryHas: false,
  injuryNotes: "",
  heartOrBp: false,
  pregnancy: false,
  recentSurgery: false,
  daysPerWeek: "3",
  sessionDuration: "",
  equipment: "",
  motivation: "",
  notifyReminders: false,
  category: "",
  primaryGoal: "",
  avoid: "",
  include: "",
  hasCompetitionDate: false,
  competitionDate: "",
  isFirstCompetition: false,
  runningFeeling: "",
  strengthFeeling: "",
  distance: "",
  hasRaceDate: false,
  raceDate: "",
  goal: "",
  currentWeeklyKm: "",
};

export function showsMedicalNotice(draft: IntakeDraft) {
  return draft.heartOrBp || draft.pregnancy || draft.recentSurgery;
}
