import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intakeSchema, requiresMedicalNotice } from "@/lib/validation/intake";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const answers = parsed.data;
  const medicalNotice = requiresMedicalNotice(answers);

  const {
    category,
    name,
    age,
    sex,
    weightKg,
    heightCm,
    trainingHistory,
    injuryHas,
    injuryNotes,
    heartOrBp,
    pregnancy,
    recentSurgery,
    daysPerWeek,
    sessionDuration,
    equipment,
    motivation,
    notifyReminders,
    ...categoryAnswers
  } = answers;

  const goalFields = deriveGoalFields(answers);

  const result = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name, age, sex, weightKg, heightCm, notifyReminders },
    });

    const goal = await tx.goal.create({
      data: {
        userId,
        category,
        ...goalFields,
      },
    });

    const intakeForm = await tx.intakeForm.create({
      data: {
        userId,
        category,
        trainingHistory,
        injuries: { has: injuryHas, notes: injuryNotes ?? null },
        healthConditions: { heartOrBp, pregnancy, recentSurgery },
        requiresMedicalNotice: medicalNotice,
        daysPerWeek,
        sessionDuration,
        equipment,
        motivation: motivation ?? null,
        categoryAnswers,
      },
    });

    return { goalId: goal.id, intakeFormId: intakeForm.id };
  });

  return NextResponse.json({ ...result, requiresMedicalNotice: medicalNotice });
}

function deriveGoalFields(answers: ReturnType<typeof intakeSchema.parse>) {
  if (answers.category === "STRENGTH") {
    return { subGoal: answers.primaryGoal };
  }
  if (answers.category === "HYROX") {
    return {
      competitionDate: answers.hasCompetitionDate
        ? new Date(answers.competitionDate!)
        : null,
      isFirstCompetition: answers.hasCompetitionDate
        ? answers.isFirstCompetition
        : null,
    };
  }
  return {
    subGoal: answers.goal,
    distance: answers.distance,
    competitionDate: answers.hasRaceDate ? new Date(answers.raceDate!) : null,
  };
}
