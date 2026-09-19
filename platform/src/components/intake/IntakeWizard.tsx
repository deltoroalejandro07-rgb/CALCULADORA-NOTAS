"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepShell } from "@/components/ui/StepShell";
import { emptyDraft, IntakeDraft } from "./types";
import { PersonalStep, isPersonalStepValid } from "./steps/PersonalStep";
import { HealthStep, isHealthStepValid } from "./steps/HealthStep";
import { LogisticsStep, isLogisticsStepValid } from "./steps/LogisticsStep";
import { CategoryStep, isCategoryStepValid } from "./steps/CategoryStep";
import {
  BranchStrengthStep,
  isBranchStrengthValid,
} from "./steps/BranchStrengthStep";
import { BranchHyroxStep, isBranchHyroxValid } from "./steps/BranchHyroxStep";
import {
  BranchRunningStep,
  isBranchRunningValid,
} from "./steps/BranchRunningStep";

const BASE_STEPS = ["personal", "health", "logistics", "category"] as const;

export function IntakeWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = draft.category
    ? [...BASE_STEPS, "branch"]
    : [...BASE_STEPS];
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  function update(patch: Partial<IntakeDraft>) {
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
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(draft)),
      });
      if (!res.ok) {
        throw new Error("No se pudo guardar tu información");
      }
      router.push("/plan/generando");
    } catch {
      setError("Algo salió mal. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  const currentValid = isStepValid(step, draft);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <StepShell
        step={stepIndex + 1}
        totalSteps={steps.length}
        title={titleFor(step, draft)}
        subtitle={subtitleFor(step)}
        onBack={stepIndex > 0 ? goBack : undefined}
        onNext={goNext}
        nextDisabled={!currentValid || submitting}
        nextLabel={isLastStep ? "Generar mi plan" : "Continuar"}
      >
        {step === "personal" && <PersonalStep draft={draft} update={update} />}
        {step === "health" && <HealthStep draft={draft} update={update} />}
        {step === "logistics" && (
          <LogisticsStep draft={draft} update={update} />
        )}
        {step === "category" && (
          <CategoryStep draft={draft} update={update} />
        )}
        {step === "branch" && draft.category === "STRENGTH" && (
          <BranchStrengthStep draft={draft} update={update} />
        )}
        {step === "branch" && draft.category === "HYROX" && (
          <BranchHyroxStep draft={draft} update={update} />
        )}
        {step === "branch" && draft.category === "RUNNING" && (
          <BranchRunningStep draft={draft} update={update} />
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </StepShell>
    </main>
  );
}

function isStepValid(step: string, draft: IntakeDraft) {
  switch (step) {
    case "personal":
      return isPersonalStepValid(draft);
    case "health":
      return isHealthStepValid(draft);
    case "logistics":
      return isLogisticsStepValid(draft);
    case "category":
      return isCategoryStepValid(draft);
    case "branch":
      if (draft.category === "STRENGTH") return isBranchStrengthValid(draft);
      if (draft.category === "HYROX") return isBranchHyroxValid(draft);
      if (draft.category === "RUNNING") return isBranchRunningValid(draft);
      return false;
    default:
      return false;
  }
}

function titleFor(step: string, draft: IntakeDraft) {
  switch (step) {
    case "personal":
      return "Cuéntanos sobre ti";
    case "health":
      return "Tu experiencia y salud";
    case "logistics":
      return "Cómo vas a entrenar";
    case "category":
      return "¿Cuál es tu objetivo?";
    case "branch":
      if (draft.category === "STRENGTH") return "Ponerte en forma";
      if (draft.category === "HYROX") return "Hyrox / reto híbrido";
      if (draft.category === "RUNNING") return "Prepararte para correr";
      return "";
    default:
      return "";
  }
}

function subtitleFor(step: string) {
  if (step === "category") {
    return "Elige la categoría que mejor describe lo que buscas ahora mismo.";
  }
  return undefined;
}

function buildPayload(draft: IntakeDraft) {
  const common = {
    name: draft.name,
    age: draft.age,
    sex: draft.sex,
    weightKg: draft.weightKg,
    heightCm: draft.heightCm,
    trainingHistory: draft.trainingHistory,
    injuryHas: draft.injuryHas,
    injuryNotes: draft.injuryNotes || undefined,
    heartOrBp: draft.heartOrBp,
    pregnancy: draft.pregnancy,
    recentSurgery: draft.recentSurgery,
    daysPerWeek: draft.daysPerWeek,
    sessionDuration: draft.sessionDuration,
    equipment: draft.equipment,
    motivation: draft.motivation || undefined,
    notifyReminders: draft.notifyReminders,
  };

  if (draft.category === "STRENGTH") {
    return {
      category: "STRENGTH",
      ...common,
      primaryGoal: draft.primaryGoal,
      avoid: draft.avoid || undefined,
      include: draft.include || undefined,
    };
  }

  if (draft.category === "HYROX") {
    return {
      category: "HYROX",
      ...common,
      hasCompetitionDate: draft.hasCompetitionDate,
      competitionDate: draft.hasCompetitionDate
        ? draft.competitionDate
        : undefined,
      isFirstCompetition: draft.hasCompetitionDate
        ? draft.isFirstCompetition
        : undefined,
      runningFeeling: draft.runningFeeling,
      strengthFeeling: draft.strengthFeeling,
    };
  }

  return {
    category: "RUNNING",
    ...common,
    distance: draft.distance,
    hasRaceDate: draft.hasRaceDate,
    raceDate: draft.hasRaceDate ? draft.raceDate : undefined,
    goal: draft.goal,
    currentWeeklyKm: draft.currentWeeklyKm,
  };
}
