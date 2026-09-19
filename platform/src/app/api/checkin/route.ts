import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkinSchema } from "@/lib/validation/checkin";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const answers = parsed.data;

  const plan = await db.trainingPlan.findFirst({
    where: { id: answers.trainingPlanId, userId },
    include: { goal: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const checkin = await db.$transaction(async (tx) => {
    const created = await tx.checkin.create({
      data: {
        userId,
        trainingPlanId: plan.id,
        adherenceFeeling: answers.adherenceFeeling,
        sessionsCompleted: answers.sessionsCompleted,
        perceivedEffort: answers.perceivedEffort,
        painReported: answers.painReported,
        painLocation: answers.painLocation ?? null,
        goalUnchanged: answers.goalUnchanged,
        newCategory: answers.goalUnchanged ? null : answers.newCategory,
        weeklyChangesNote: answers.weeklyChangesNote ?? null,
        competitionStatus: answers.competitionStatus ?? null,
        newCompetitionDate: answers.newCompetitionDate
          ? new Date(answers.newCompetitionDate)
          : null,
        competitionResult: answers.competitionResult ?? null,
      },
    });

    if (!answers.goalUnchanged && answers.newCategory) {
      const newGoal = await tx.goal.create({
        data: {
          userId,
          category: answers.newCategory,
          competitionDate: plan.goal.competitionDate,
          isFirstCompetition: plan.goal.isFirstCompetition,
          distance: plan.goal.distance,
        },
      });
      await tx.goal.update({
        where: { id: plan.goal.id },
        data: { active: false, supersededById: newGoal.id },
      });
    } else if (answers.competitionStatus === "CANCELLED") {
      await tx.goal.update({
        where: { id: plan.goal.id },
        data: { competitionDate: null, isFirstCompetition: null },
      });
    } else if (
      answers.competitionStatus === "CHANGED" &&
      answers.newCompetitionDate
    ) {
      await tx.goal.update({
        where: { id: plan.goal.id },
        data: { competitionDate: new Date(answers.newCompetitionDate) },
      });
    }

    return created;
  });

  return NextResponse.json({ checkinId: checkin.id });
}
