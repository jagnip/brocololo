import { SlotInputType } from "@/types/planner";
import { prisma } from "./index";

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