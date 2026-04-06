import { cache } from "react";
import { SlotInputType, SlotSaveData } from "@/types/planner";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import { FIXED_SNACK_RECIPE_ID } from "@/lib/constants";
import {
  LogMealType,
  LogPerson,
  PlannerMealType,
  Prisma,
} from "@/src/generated/client";
import { getDaysInRange } from "@/lib/planner/helpers";
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

/** Dedupes within a single RSC request (e.g. layout + page both need the plan list). */
export const getPlansCached = cache(getPlans);

export async function getLatestPlanId() {
  const plan = await prisma.plan.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return plan?.id ?? null;
}

export async function deletePlanById(planId: string) {
  await prisma.plan.delete({
    where: { id: planId },
  });
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

export async function getPlanDateRangeById(planId: string) {
  return prisma.plan.findUnique({
    where: { id: planId },
    select: { startDate: true, endDate: true },
  });
}

export type PlannerPoolIngredientRow = {
  ingredientId: string;
  unitId: string;
  amount: number;
};

export type PlannerPoolItem = {
  id: string;
  date: Date;
  mealType: LogMealType;
  title: string;
  sourceRecipeId: string | null;
  imageUrl: string | null;
  ingredients: PlannerPoolIngredientRow[];
};

export type DateCollisionResult = {
  dates: string[];
  conflictingLogIds: string[];
  conflictingPlanIds: string[];
};

/**
 * Global single-owner date collision check.
 * Excludes the currently edited owner so updating the same plan/log pair is allowed.
 */
export async function findDateCollisionsTx(params: {
  tx: Prisma.TransactionClient;
  dateKeys: string[];
  excludePlanId?: string;
  excludeLogId?: string;
}): Promise<DateCollisionResult> {
  if (params.dateKeys.length === 0) {
    return {
      dates: [],
      conflictingLogIds: [],
      conflictingPlanIds: [],
    };
  }

  const entries = await params.tx.logEntry.findMany({
    where: {
      date: {
        in: params.dateKeys.map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`)),
      },
      ...(params.excludeLogId
        ? { NOT: { logId: params.excludeLogId } }
        : {}),
      ...(params.excludePlanId
        ? { log: { planId: { not: params.excludePlanId } } }
        : {}),
    },
    select: {
      date: true,
      logId: true,
      log: {
        select: {
          planId: true,
        },
      },
    },
  });

  return {
    dates: [...new Set(entries.map((entry) => entry.date.toISOString().slice(0, 10)))].sort(),
    conflictingLogIds: [...new Set(entries.map((entry) => entry.logId))].sort(),
    conflictingPlanIds: [...new Set(entries.map((entry) => entry.log.planId))].sort(),
  };
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
): Promise<
  | {
      type: "success";
      plan: Awaited<ReturnType<typeof prisma.plan.create>>;
    }
  | {
      type: "date_conflict";
      dates: string[];
      conflictingLogIds: string[];
      conflictingPlanIds: string[];
    }
> {
  const now = new Date();
  const uniqueRecipeIds = [
    ...new Set(slots.filter((s) => s.recipe).map((s) => s.recipe!.id)),
  ];

  const result = await prisma.$transaction(async (tx) => {
    const dateKeys = [...new Set(slots.map((slot) => slot.date.toISOString().slice(0, 10)))];
    const dateCollision = await findDateCollisionsTx({
      tx,
      dateKeys,
    });
    if (dateCollision.dates.length > 0) {
      return {
        type: "date_conflict" as const,
        dates: dateCollision.dates,
        conflictingLogIds: dateCollision.conflictingLogIds,
        conflictingPlanIds: dateCollision.conflictingPlanIds,
      };
    }

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
    return { type: "success" as const, plan: createdPlan };
  }, { timeout: 30000 });

  if (result.type === "date_conflict") {
    return result;
  }

  if (uniqueRecipeIds.length > 0) {
    await prisma.recipe.updateMany({
      where: { id: { in: uniqueRecipeIds } },
      data: { lastUsedInPlanner: now },
    });
  }

  return result;
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
  // Snack is a fixed baseline recipe that should always be prefilled for new plans.
  const fixedSnackRecipe = await tx.recipe.findUnique({
    where: { id: FIXED_SNACK_RECIPE_ID },
    select: {
      id: true,
      servings: true,
      servingMultiplierForNelson: true,
      ingredients: {
        select: {
          ingredientId: true,
          amount: true,
          nutritionTarget: true,
          unitId: true,
        },
      },
    },
  });

  if (!fixedSnackRecipe) {
    throw new Error("FIXED_SNACK_RECIPE_NOT_FOUND");
  }

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
      const snackEntry = await tx.logEntry.create({
        data: {
          logId: log.id,
          date: dayDate,
          mealType: LogMealType.SNACK,
          person,
        },
        select: { id: true },
      });

      void snackEntry;
    }

    for (const slot of slots) {
      await tx.logEntry.create({
        data: {
          logId: log.id,
          date: slot.date,
          mealType: toLogMealType(slot.mealType),
          person,
        },
      });
    }
  }

  return log.id;
}

export async function getPlannerPoolItemsForPlan(params: {
  planId: string;
  person: LogPerson;
}): Promise<PlannerPoolItem[]> {
  const slots = await getPlanById(params.planId);
  if (!slots) return [];

  // Pool = unused plan slots only: matches planner "used" checkmarks and reserveNextUnusedPlanSlot.
  const items: PlannerPoolItem[] = [];
  for (const slot of slots) {
    if (!slot.recipe) continue;
    if (slot.used) {
      continue;
    }
    const dayKey = slot.date.toISOString().slice(0, 10);
    const mealType = toLogMealType(slot.mealType);

    items.push({
      id: `plan-${dayKey}-${mealType}-${slot.recipe.id}`,
      date: slot.date,
      mealType,
      title: slot.recipe.name,
      sourceRecipeId: slot.recipe.id,
      imageUrl: slot.recipe.images.find((image) => image.isCover)?.url ?? null,
      ingredients: slot.recipe.ingredients
        .map((ri) => {
          const personAmount = getPersonIngredientAmountPerMeal({
            amount: ri.amount,
            nutritionTarget: ri.nutritionTarget,
            person: params.person === LogPerson.PRIMARY ? "primary" : "secondary",
            recipeServings: slot.recipe!.servings,
            servingMultiplierForNelson: slot.recipe!.servingMultiplierForNelson,
          });
          if (personAmount == null || ri.unitId == null) return null;
          return {
            ingredientId: ri.ingredientId,
            unitId: ri.unitId,
            amount: Math.round(personAmount * 1000) / 1000,
          };
        })
        .filter((row): row is PlannerPoolIngredientRow => row != null),
    });
  }

  return items.sort((a, b) => {
    const dayCmp = a.date.toISOString().localeCompare(b.date.toISOString());
    if (dayCmp !== 0) return dayCmp;
    return a.mealType.localeCompare(b.mealType);
  });
}

export async function reserveNextUnusedPlanSlot(params: {
  planId: string;
  recipeId: string;
}): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reserved = await prisma.$transaction(async (tx) => {
      const slot = await tx.planSlot.findFirst({
        where: {
          planId: params.planId,
          recipeId: params.recipeId,
          used: false,
        },
        orderBy: [
          { date: "asc" },
          { mealType: "asc" },
          { id: "asc" },
        ],
        select: { id: true },
      });

      if (!slot) {
        return null;
      }

      const updated = await tx.planSlot.updateMany({
        where: {
          id: slot.id,
          used: false,
        },
        data: { used: true },
      });

      if (updated.count === 0) {
        return "__RETRY__";
      }

      return slot.id;
    });

    if (reserved === "__RETRY__") {
      continue;
    }

    return reserved;
  }

  return null;
}

export async function releaseReservedPlanSlot(planSlotId: string) {
  await prisma.planSlot.updateMany({
    where: { id: planSlotId },
    data: { used: false },
  });
}

export async function reserveNextUnusedPlanSlotTx(params: {
  tx: Prisma.TransactionClient;
  planId: string;
  recipeId: string;
}): Promise<string | null> {
  const slot = await params.tx.planSlot.findFirst({
    where: {
      planId: params.planId,
      recipeId: params.recipeId,
      used: false,
    },
    orderBy: [{ date: "asc" }, { mealType: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (!slot) {
    return null;
  }

  const updated = await params.tx.planSlot.updateMany({
    where: {
      id: slot.id,
      used: false,
    },
    data: { used: true },
  });

  if (updated.count === 0) {
    return null;
  }

  return slot.id;
}

export async function releaseReservedPlanSlotTx(params: {
  tx: Prisma.TransactionClient;
  planSlotId: string;
}) {
  await params.tx.planSlot.updateMany({
    where: { id: params.planSlotId },
    data: { used: false },
  });
}

type PlanSyncImpact = {
  impactedDates: string[];
  impactedLogMealsCount: number;
  impactedPlanMealsCount: number;
};

export type UpdatePlanResult =
  | { type: "success" }
  | {
      type: "date_conflict";
      dates: string[];
      conflictingLogIds: string[];
      conflictingPlanIds: string[];
    }
  | ({ type: "sync_conflict" } & PlanSyncImpact);

type UpdatePlanOptions = {
  // Force applying a destructive sync after explicit user confirmation.
  forceDestructiveSync?: boolean;
};

function toDateKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export async function updatePlan(
  planId: string,
  slots: SlotSaveData[],
  options: UpdatePlanOptions = {},
): Promise<UpdatePlanResult> {
  const now = new Date();
  const uniqueRecipeIds = [
    ...new Set(slots.filter((s) => s.recipeId).map((s) => s.recipeId!)),
  ];

  const dates = slots.map((s) => new Date(s.date).getTime());
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));
  const nextDateKeys = new Set(slots.map((slot) => toDateKey(slot.date)));
  const forceDestructiveSync = options.forceDestructiveSync ?? false;

  const result = await prisma.$transaction(async (tx) => {
    const existingPlan = await tx.plan.findUnique({
      where: { id: planId },
      include: {
        log: { select: { id: true } },
        slots: {
          select: {
            date: true,
            recipeId: true,
          },
        },
      },
    });
    if (!existingPlan) {
      throw new Error("PLAN_NOT_FOUND");
    }

    const existingDateKeys = new Set(existingPlan.slots.map((slot) => toDateKey(slot.date)));
    const removedDateKeys = [...existingDateKeys].filter((dateKey) => !nextDateKeys.has(dateKey)).sort();
    const addedDateKeys = [...nextDateKeys].filter((dateKey) => !existingDateKeys.has(dateKey)).sort();

    // Block extending a plan into dates already owned by another plan/log pair.
    const dateCollision = await findDateCollisionsTx({
      tx,
      dateKeys: addedDateKeys,
      excludePlanId: planId,
    });
    if (dateCollision.dates.length > 0) {
      return {
        type: "date_conflict" as const,
        dates: dateCollision.dates,
        conflictingLogIds: dateCollision.conflictingLogIds,
        conflictingPlanIds: dateCollision.conflictingPlanIds,
      };
    }

    const impactedPlanMealsCount = existingPlan.slots.filter(
      (slot) => removedDateKeys.includes(toDateKey(slot.date)) && slot.recipeId != null,
    ).length;

    let impactedLogMealsCount = 0;
    if (existingPlan.log && removedDateKeys.length > 0) {
      // Count non-empty log entries only on removed days.
      const impactedEntries = await tx.logEntry.findMany({
        where: {
          logId: existingPlan.log.id,
          date: { in: removedDateKeys.map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`)) },
          OR: [{ recipes: { some: {} } }, { ingredients: { some: {} } }],
        },
        select: { id: true },
      });
      impactedLogMealsCount = impactedEntries.length;
    }

    if ((impactedPlanMealsCount > 0 || impactedLogMealsCount > 0) && !forceDestructiveSync) {
      return {
        type: "sync_conflict" as const,
        impactedDates: removedDateKeys,
        impactedLogMealsCount,
        impactedPlanMealsCount,
      };
    }

    await tx.planSlotAlternative.deleteMany({ where: { planSlot: { planId } } });
    await tx.planSlot.deleteMany({ where: { planId } });

    await tx.plan.update({
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

    if (existingPlan.log) {
      const logId = existingPlan.log.id;
      const mealTypes = [
        LogMealType.BREAKFAST,
        LogMealType.LUNCH,
        LogMealType.SNACK,
        LogMealType.DINNER,
      ] as const;
      const people = [LogPerson.PRIMARY, LogPerson.SECONDARY] as const;

      // Keep log days aligned with plan dates.
      for (const dateKey of removedDateKeys) {
        await tx.logEntry.deleteMany({
          where: {
            logId,
            date: new Date(`${dateKey}T00:00:00.000Z`),
          },
        });
      }
      for (const dateKey of addedDateKeys) {
        const date = new Date(`${dateKey}T00:00:00.000Z`);
        for (const person of people) {
          for (const mealType of mealTypes) {
            await tx.logEntry.upsert({
              where: {
                logId_date_mealType_person: {
                  logId,
                  date,
                  mealType,
                  person,
                },
              },
              update: {},
              create: {
                logId,
                date,
                mealType,
                person,
              },
            });
          }
        }
      }
    }

    return { type: "success" as const };
  }, { timeout: 15000 });

  if (result.type === "sync_conflict") {
    return result;
  }

  if (uniqueRecipeIds.length > 0) {
    await prisma.recipe.updateMany({
      where: { id: { in: uniqueRecipeIds } },
      data: { lastUsedInPlanner: now },
    });
  }

  return result;
}

export async function generateBaselineLogForPlan(
  planId: string,
): Promise<
  | { type: "success"; logId: string }
  | { type: "date_conflict"; dates: string[] }
  | { type: "already_exists"; logId: string }
> {
  const slots = await getPlanById(planId);
  if (!slots) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const planDateKeys = [...new Set(slots.map((slot) => slot.date.toISOString().slice(0, 10)))].sort();
  const minDate = new Date(`${planDateKeys[0]}T00:00:00.000Z`);
  const maxDate = new Date(`${planDateKeys[planDateKeys.length - 1]}T23:59:59.999Z`);
  const planDateKeySet = new Set(planDateKeys);

  const existingEntries = await prisma.logEntry.findMany({
    where: {
      date: {
        gte: minDate,
        lte: maxDate,
      },
    },
    select: { date: true },
  });

  const conflictDates = [...new Set(
    existingEntries
      .map((entry) => entry.date.toISOString().slice(0, 10))
      .filter((dateKey) => planDateKeySet.has(dateKey)),
  )].sort();

  if (conflictDates.length > 0) {
    return { type: "date_conflict", dates: conflictDates };
  }

  const existingLog = await prisma.log.findUnique({
    where: { planId },
    select: { id: true },
  });

  if (existingLog) {
    return { type: "already_exists", logId: existingLog.id };
  }

  try {
    const logId = await prisma.$transaction(
      (tx) => createBaselineLogTx(tx, planId, slots),
      { timeout: 30000 },
    );

    return { type: "success", logId };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const fallback = await prisma.log.findUnique({
        where: { planId },
        select: { id: true },
      });

      if (fallback) {
        return { type: "already_exists", logId: fallback.id };
      }
    }

    throw error;
  }
}
