"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepShell } from "@/components/ui";
import { CheckinDraft, emptyCheckinDraft } from "./types";
import { StepHowItWent, isStepHowItWentValid } from "./steps/StepHowItWent";
import { StepHowYouFelt, isStepHowYouFeltValid } from "./steps/StepHowYouFelt";
import { StepGoal, isStepGoalValid } from "./steps/StepGoal";
import { StepClosing } from "./steps/StepClosing";

const STEPS = ["how_it_went", "how_you_felt", "goal", "closing"] as const;

export function CheckinWizard({
  trainingPlanId,
  hasCompetition,
}: {
  trainingPlanId: string;
  hasCompetition: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckinDraft>(emptyCheckinDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  function update(patch: Partial<CheckinDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function goNext() {
    if (isLastStep) {
      void submit();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainingPlanId,
          adherenceFeeling: draft.adherenceFeeling,
          sessionsCompleted: draft.sessionsCompleted,
          perceivedEffort: draft.perceivedEffort,
          painReported: draft.painReported,
          painLocation: draft.painLocation || undefined,
          goalUnchanged: draft.goalUnchanged,
          newCategory: draft.newCategory || undefined,
          weeklyChangesNote: draft.weeklyChangesNote || undefined,
          competitionStatus: hasCompetition
            ? draft.competitionStatus || undefined
            : undefined,
          newCompetitionDate: draft.newCompetitionDate || undefined,
          competitionResult: draft.competitionResult || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error guardando el check-in");
      router.push(`/checkin/paywall?checkinId=${data.checkinId}`);
    } catch {
      setError("No hemos podido guardar tu check-in. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  const currentValid = isStepValid(step, draft, hasCompetition);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <StepShell
        step={stepIndex + 1}
        totalSteps={STEPS.length}
        title={titleFor(step)}
        onBack={stepIndex > 0 ? goBack : undefined}
        onNext={goNext}
        nextDisabled={!currentValid || submitting}
        nextLabel={isLastStep ? "Generar mi plan del próximo mes" : "Continuar"}
      >
        {step === "how_it_went" && (
          <StepHowItWent draft={draft} update={update} />
        )}
        {step === "how_you_felt" && (
          <StepHowYouFelt draft={draft} update={update} />
        )}
        {step === "goal" && (
          <StepGoal
            draft={draft}
            update={update}
            hasCompetition={hasCompetition}
          />
        )}
        {step === "closing" && <StepClosing />}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </StepShell>
    </main>
  );
}

function isStepValid(
  step: string,
  draft: CheckinDraft,
  hasCompetition: boolean,
) {
  switch (step) {
    case "how_it_went":
      return isStepHowItWentValid(draft);
    case "how_you_felt":
      return isStepHowYouFeltValid(draft);
    case "goal":
      return isStepGoalValid(draft, hasCompetition);
    case "closing":
      return true;
    default:
      return false;
  }
}

function titleFor(step: string) {
  switch (step) {
    case "how_it_went":
      return "Cómo te fue";
    case "how_you_felt":
      return "Cómo te sentiste";
    case "goal":
      return "Tu objetivo";
    case "closing":
      return "¡Listo!";
    default:
      return "";
  }
}
