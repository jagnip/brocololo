import { SlotInputType } from "@/types/planner";
import { prisma } from "./index";

const recipeInclude = {
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
} as const;

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
          recipe: { include: recipeInclude },
          alternatives: {
            orderBy: { rank: "asc" },
            include: {
              recipe: { include: recipeInclude },
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
    alternatives: slot.alternatives.map((a) => a.recipe),
  }));
}

export async function createPlan(
  startDate: Date,
  endDate: Date,
  slots: SlotInputType[]
) {
  const now = new Date();
  const uniqueRecipeIds = [
    ...new Set(slots.filter((s) => s.recipe).map((s) => s.recipe!.id)),
  ];

  const plan = await prisma.plan.create({
    data: {
      startDate,
      endDate,
      slots: {
        create: slots.map((s) => ({
          date: s.date,
          mealType: s.mealType,
          recipeId: s.recipe?.id ?? null,
          alternatives: {
            create: s.alternatives.map((alt, index) => ({
              recipeId: alt.id,
              rank: index,
            })),
          },
        })),
      },
    },
    include: { slots: true },
  });

  if (uniqueRecipeIds.length > 0) {
    await prisma.recipe.updateMany({
      where: { id: { in: uniqueRecipeIds } },
      data: { lastUsedInPlanner: now },
    });
  }

  return plan;
}

export async function updatePlan(planId: string, slots: SlotInputType[]) {
  const now = new Date();
  const uniqueRecipeIds = [
    ...new Set(slots.filter((s) => s.recipe).map((s) => s.recipe!.id)),
  ];

  const dates = slots.map((s) => s.date.getTime());
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));

  const plan = await prisma.$transaction(async (tx) => {
    await tx.planSlot.deleteMany({ where: { planId } });

    return tx.plan.update({
      where: { id: planId },
      data: {
        startDate,
        endDate,
        slots: {
          create: slots.map((s) => ({
            date: s.date,
            mealType: s.mealType,
            recipeId: s.recipe?.id ?? null,
            alternatives: {
              create: s.alternatives.map((alt, index) => ({
                recipeId: alt.id,
                rank: index,
              })),
            },
          })),
        },
      },
      include: { slots: true },
    });
  });

  if (uniqueRecipeIds.length > 0) {
    await prisma.recipe.updateMany({
      where: { id: { in: uniqueRecipeIds } },
      data: { lastUsedInPlanner: now },
    });
  }

  return plan;
}
