import { SlotInputType, SlotSaveData } from "@/types/planner";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import {
  LogMealType,
  LogPerson,
  PlannerMealType,
  Prisma,
} from "@/src/generated/client";
import { prisma } from "./index";

const recipeInclude = {
  categories: {
    select: { id: true, slug: true, name: true, type: true },
  },
  ingredientGroups: {
    orderBy: { position: "asc" as const },
  },
  ingredients: {
    orderBy: { position: "asc" as const },
    include: {
      group: true,
      ingredient: {
        include: {
          unitConversions: {
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      unit: true,
    },
  },
  instructions: {
    orderBy: { position: "asc" as const },
    include: {
      ingredients: {
        include: {
          recipeIngredient: {
            include: {
              ingredient: {
                include: {
                  unitConversions: {
                    include: {
                      unit: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              unit: true,
            },
          },
        },
      },
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

// Returns unused recipes from the most recent plan, grouped by recipeId.
// meals = number of unused slots for that recipe (the "debt" to carry forward).
export async function getUnusedRecipesFromLatestPlan() {
  const latestPlan = await prisma.plan.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      slots: {
        where: { used: false, recipeId: { not: null } },
        select: {
          recipeId: true,
          recipe: { select: { excludeFromPlanner: true } },
        },
      },
    },
  });

  if (!latestPlan) return [];

  const countsById = new Map<string, number>();
  for (const slot of latestPlan.slots) {
    if (slot.recipe?.excludeFromPlanner) continue;
    const id = slot.recipeId!;
    countsById.set(id, (countsById.get(id) ?? 0) + 1);
  }

  return Array.from(countsById, ([recipeId, meals]) => ({ recipeId, meals }));
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
    used: slot.used,
  }));
}

export async function getPlanForGroceries(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      slots: {
        include: {
          recipe: {
            select: {
              name: true,
              servings: true,
              servingMultiplierForNelson: true,
              ingredients: {
                include: {
                  ingredient: {
                    select: {
                      id: true,
                      name: true,
                      icon: true,
                      supermarketUrl: true,
                      unitConversions: true,
                      category: { select: { name: true, sortOrder: true } },
                    },
                  },
                  unit: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) return null;

  return {
    slots: plan.slots.map((s) => ({
      date: s.date.toISOString(),
      recipe: s.recipe,
    })),
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate.toISOString(),
  };
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

  const plan = await prisma.$transaction(async (tx) => {
    const createdPlan = await tx.plan.create({
      data: {
        startDate,
        endDate,
        slots: {
          create: slots.map((s) => ({
            date: s.date,
            mealType: s.mealType,
            recipeId: s.recipe?.id ?? null,
            used: s.used,
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

    await createBaselineLogTx(tx, createdPlan.id, slots);
    return createdPlan;
  }, { timeout: 30000 });

  if (uniqueRecipeIds.length > 0) {
    await prisma.recipe.updateMany({
      where: { id: { in: uniqueRecipeIds } },
      data: { lastUsedInPlanner: now },
    });
  }

  return plan;
}

function toLogMealType(mealType: PlannerMealType): LogMealType {
  if (mealType === PlannerMealType.BREAKFAST) return LogMealType.BREAKFAST;
  if (mealType === PlannerMealType.LUNCH) return LogMealType.LUNCH;
  return LogMealType.DINNER;
}

async function createBaselineLogTx(
  tx: Prisma.TransactionClient,
  planId: string,
  slots: SlotInputType[],
) {
  const log = await tx.log.create({
    data: { planId },
    select: { id: true },
  });

  const uniqueDaysByKey = new Map<string, Date>();
  for (const slot of slots) {
    const key = slot.date.toISOString().slice(0, 10);
    if (!uniqueDaysByKey.has(key)) uniqueDaysByKey.set(key, new Date(slot.date));
  }
  const people: Array<{ person: LogPerson; role: "primary" | "secondary" }> = [
    { person: LogPerson.PRIMARY, role: "primary" },
    { person: LogPerson.SECONDARY, role: "secondary" },
  ];

  for (const { person, role } of people) {
    for (const dayDate of uniqueDaysByKey.values()) {
      await tx.logEntry.create({
        data: {
          logId: log.id,
          date: dayDate,
          mealType: LogMealType.SNACK,
          person,
        },
      });
    }

    for (const slot of slots) {
      const entry = await tx.logEntry.create({
        data: {
          logId: log.id,
          date: slot.date,
          mealType: toLogMealType(slot.mealType),
          person,
        },
        select: { id: true },
      });

      if (!slot.recipe) continue;

      const entryRecipe = await tx.logEntryRecipe.create({
        data: {
          entryId: entry.id,
          sourceRecipeId: slot.recipe.id,
          position: 0,
        },
        select: { id: true },
      });

      const rows = slot.recipe.ingredients
        .map((ri) => {
          const personAmount = getPersonIngredientAmountPerMeal({
            amount: ri.amount,
            nutritionTarget: ri.nutritionTarget,
            person: role,
            recipeServings: slot.recipe!.servings,
            servingMultiplierForNelson: slot.recipe!.servingMultiplierForNelson,
          });

          if (personAmount == null) return null;

          return {
            entryId: entry.id,
            entryRecipeId: entryRecipe.id,
            ingredientId: ri.ingredientId,
            amount: personAmount,
            unitId: ri.unitId ?? null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length > 0) {
        await tx.logIngredient.createMany({ data: rows });
      }
    }
  }
}

export async function updatePlan(planId: string, slots: SlotSaveData[]) {
  const now = new Date();
  const uniqueRecipeIds = [
    ...new Set(slots.filter((s) => s.recipeId).map((s) => s.recipeId!)),
  ];

  const dates = slots.map((s) => new Date(s.date).getTime());
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));

  const plan = await prisma.$transaction(async (tx) => {
    await tx.planSlotAlternative.deleteMany({ where: { planSlot: { planId } } });
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
            recipeId: s.recipeId,
            used: s.used,
            alternatives: {
              create: s.alternativeRecipeIds.map((recipeId, index) => ({
                recipeId,
                rank: index,
              })),
            },
          })),
        },
      },
      include: { slots: true },
    });
  }, { timeout: 15000 });

  if (uniqueRecipeIds.length > 0) {
    await prisma.recipe.updateMany({
      where: { id: { in: uniqueRecipeIds } },
      data: { lastUsedInPlanner: now },
    });
  }

  return plan;
}
