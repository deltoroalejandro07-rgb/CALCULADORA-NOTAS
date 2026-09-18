import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTrainingPlan } from "@/lib/ai/generatePlan";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  const existingPlan = await db.trainingPlan.findFirst({ where: { userId } });
  if (existingPlan) {
    return NextResponse.json({ planId: existingPlan.id });
  }

  const [user, intakeForm, goal] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.intakeForm.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    db.goal.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!intakeForm || !goal) {
    return NextResponse.json(
      { error: "Completa primero el formulario de intake" },
      { status: 400 },
    );
  }

  const { plan, weeksToCompetition, model } = await generateTrainingPlan({
    user,
    intakeForm,
    goal,
    monthNumber: 1,
  });

  const trainingPlan = await db.trainingPlan.create({
    data: {
      userId,
      goalId: goal.id,
      intakeFormId: intakeForm.id,
      monthNumber: 1,
      isFree: true,
      planJson: plan,
      weeksToCompetition,
      aiModel: model,
    },
  });

  return NextResponse.json({ planId: trainingPlan.id });
}
