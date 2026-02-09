import { SlotInputType } from "@/types/planner";
import { prisma } from "./index";

export async function getPlans() {
  return prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, startDate: true, endDate: true },
  });
}

export async function getLatestPlanId() {
  const plan = await prisma.plan.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return plan?.id ?? null;
}

export async function getPlanById(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      slots: {
        include: {
          recipe: {
            include: {
              categories: {
                select: { id: true, slug: true, name: true, type: true },
              },
              ingredients: {
                include: {
                  ingredient: { include: { unitConversions: true } },
                  unit: true,
                },
              },
              images: true,
            },
          },
        },
      },
    },
  });

  if (!plan) return null;

  return plan.slots.map((slot) => ({
    date: slot.date,
    mealType: slot.mealType,
    recipe: slot.recipe,
  }));
}

export async function createPlan(
  startDate: Date,
  endDate: Date,
  slots: SlotInputType[]
) {
  const now = new Date();
  const uniqueRecipeIds = [...new Set(slots.map((s) => s.recipe.id))];

  const plan = await prisma.plan.create({
    data: {
      startDate,
      endDate,
      slots: {
        create: slots.map((s) => ({
          date: s.date,
          mealType: s.mealType,
          recipeId: s.recipe.id,
        })),
      },
    },
    include: { slots: true },
  });

  await prisma.recipe.updateMany({
    where: { id: { in: uniqueRecipeIds } },
    data: { lastUsedInPlanner: now },
  });

  return plan;
}