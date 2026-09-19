export interface CheckinDraft {
  adherenceFeeling: "GREAT" | "OK_SKIPPED_SOME" | "STRUGGLED" | "";
  sessionsCompleted: "ALMOST_ALL" | "ABOUT_HALF" | "FEW_OR_NONE" | "";
  perceivedEffort: "EASY" | "JUST_RIGHT" | "HARD" | "TOO_MUCH" | "";
  painReported: "NONE" | "MILD" | "SEVERE" | "";
  painLocation: string;
  goalUnchanged: boolean | null;
  newCategory: "STRENGTH" | "HYROX" | "RUNNING" | "";
  weeklyChangesNote: string;
  competitionStatus: "UNCHANGED" | "CANCELLED" | "CHANGED" | "";
  newCompetitionDate: string;
  competitionResult: string;
}

export const emptyCheckinDraft: CheckinDraft = {
  adherenceFeeling: "",
  sessionsCompleted: "",
  perceivedEffort: "",
  painReported: "",
  painLocation: "",
  goalUnchanged: null,
  newCategory: "",
  weeklyChangesNote: "",
  competitionStatus: "",
  newCompetitionDate: "",
  competitionResult: "",
};
