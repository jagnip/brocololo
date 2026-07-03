import { cache } from "react";
import {
  PlanCustomMeal,
  SlotInputType,
  SlotSaveData,
} from "@/types/planner";
import { getFamilyMemberIngredientAmountPerMeal } from "@/lib/log/helpers";
import {
  LogMealType,
  PlannerMealType,
  Prisma,
} from "@/src/generated/client";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
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
      memberTargets: {
        select: { familyMemberId: true },
      },
      ingredient: {
        include: {
          category: {
            select: { id: true, name: true, slug: true, sortOrder: true },
          },
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
              memberTargets: {
                select: { familyMemberId: true },
              },
              ingredient: {
                include: {
                  category: {
                    select: { id: true, name: true, slug: true, sortOrder: true },
                  },
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
  audienceMembers: {
    select: { familyMemberId: true },
  },
  memberPortions: true,
} as const;

function mapCustomMealFromSlot(slot: {
  customName: string | null;
  customIngredients: Array<{
    ingredientId: string;
    unitId: string | null;
    amount: number | null;
  }>;
}): PlanCustomMeal | null {
  if (!slot.customName) {
    return null;
  }

  return {
    name: slot.customName,
    ingredients: slot.customIngredients.map((row) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      amount: row.amount,
    })),
  };
}

function buildCustomIngredientCreates(customMeal: PlanCustomMeal | null | undefined) {
  if (!customMeal || customMeal.ingredients.length === 0) {
    return undefined;
  }

  return {
    create: customMeal.ingredients.map((row, index) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      amount: row.amount,
      position: index,
    })),
  };
}

function slotInputToCreateData(s: SlotInputType) {
  const customMeal = s.customMeal;
  const hasCustom = customMeal != null;

  return {
    date: s.date,
    mealType: s.mealType,
    recipeId: hasCustom ? null : (s.recipe?.id ?? null),
    customName: hasCustom ? customMeal.name : null,
    used: s.used,
    customIngredients: hasCustom
      ? buildCustomIngredientCreates(customMeal)
      : undefined,
    alternatives: hasCustom
      ? undefined
      : {
          create: s.alternatives.map((alt, index) => ({
            recipeId: alt.id,
            rank: index,
          })),
        },
  };
}

function slotSaveDataToCreateData(s: SlotSaveData) {
  const hasCustom = s.customMeal != null;

  return {
    date: s.date,
    mealType: s.mealType,
    recipeId: hasCustom ? null : s.recipeId,
    customName: hasCustom ? s.customMeal!.name : null,
    used: s.used,
    customIngredients: hasCustom
      ? buildCustomIngredientCreates(s.customMeal)
      : undefined,
    alternatives: hasCustom
      ? undefined
      : {
          create: s.alternativeRecipeIds.map((recipeId, index) => ({
            recipeId,
            rank: index,
          })),
        },
  };
}

export async function getPlans(userId: string) {
  return prisma.plan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, startDate: true, endDate: true },
  });
}

/** Dedupes within a single RSC request (e.g. layout + page both need the plan list). */
export const getPlansCached = cache(getPlans);

/**
 * Returns canonical UTC day keys (YYYY-MM-DD) already owned by plans/logs.
 * Used to disable dates in planner create picker before generation/save.
 */
export async function getOccupiedDateKeysForPlanning(userId: string) {
  const [planSlots, logEntries] = await Promise.all([
    prisma.planSlot.findMany({
      where: { plan: { userId } },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.logEntry.findMany({
      where: { log: { plan: { userId } } },
      select: { date: true },
      distinct: ["date"],
    }),
  ]);

  return [...new Set([...planSlots, ...logEntries].map((row) => toDateKey(row.date)))].sort();
}

export async function getLatestPlanId(userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return plan?.id ?? null;
}

export async function deletePlanById(userId: string, planId: string) {
  const owned = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("PLAN_NOT_FOUND");
  }
  await prisma.plan.delete({
    where: { id: planId },
  });
}

// Returns unused recipes from the most recent plan, grouped by recipeId.
// meals = number of unused slots for that recipe (the "debt" to carry forward).
export async function getUnusedRecipesFromLatestPlan(userId: string) {
  const latestPlan = await prisma.plan.findFirst({
    where: { userId },
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

export async function getPlanById(userId: string, planId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    include: {
      audienceMembers: {
        select: { familyMemberId: true },
      },
      slots: {
        include: {
          recipe: { include: recipeInclude },
          customIngredients: {
            orderBy: { position: "asc" },
            select: {
              ingredientId: true,
              unitId: true,
              amount: true,
            },
          },
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
  const cookingFamilyMemberIds = plan.audienceMembers.map(
    (member) => member.familyMemberId,
  );

  return plan.slots.map((slot) => ({
    id: slot.id,
    date: slot.date,
    mealType: slot.mealType,
    recipe: slot.recipe,
    customMeal: mapCustomMealFromSlot(slot),
    alternatives: slot.alternatives.map((a) => a.recipe),
    cookingFamilyMemberIds,
    used: slot.used,
  }));
}

export async function getPlanDateRangeById(userId: string, planId: string) {
  return prisma.plan.findFirst({
    where: { id: planId, userId },
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
  planSlotId: string;
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
  userId: string;
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
      log: {
        plan: { userId: params.userId },
        ...(params.excludePlanId
          ? { planId: { not: params.excludePlanId } }
          : {}),
      },
      ...(params.excludeLogId
        ? { NOT: { logId: params.excludeLogId } }
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

export async function getPlanForGroceries(userId: string, planId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    include: {
      slots: {
        include: {
          recipe: {
            select: {
              name: true,
              servings: true,
              ingredients: {
                include: {
                  ingredient: {
                    select: {
                      id: true,
                      name: true,
                      brand: true,
                      descriptor: true,
                      icon: true,
                      supermarketUrl: true,
                      unitConversions: true,
                      category: { select: { id: true, name: true, sortOrder: true } },
                    },
                  },
                  unit: { select: { id: true, name: true } },
                },
              },
            },
          },
          customIngredients: {
            orderBy: { position: "asc" },
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  descriptor: true,
                  icon: true,
                  supermarketUrl: true,
                  unitConversions: true,
                  category: { select: { id: true, name: true, sortOrder: true } },
                },
              },
              unit: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!plan) return null;

  return {
    slots: plan.slots.map((s) => ({
      recipeId: s.recipeId,
      date: s.date.toISOString(),
      recipe: s.recipe,
      customName: s.customName,
      customIngredients: s.customIngredients,
    })),
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate.toISOString(),
  };
}

export async function createPlan(
  userId: string,
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
      userId,
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
        userId,
        startDate,
        endDate,
        audienceMembers: {
          create: [
            ...new Set(slots.flatMap((slot) => slot.cookingFamilyMemberIds ?? [])),
          ].map((familyMemberId) => ({ familyMemberId })),
        },
        slots: {
          create: slots.map((s) => slotInputToCreateData(s)),
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

export async function createBaselineLogTx(
  tx: Prisma.TransactionClient,
  userId: string,
  planId: string,
  slots: SlotInputType[],
) {
  const log = await tx.log.create({
    data: { planId },
    select: { id: true },
  });

  const cookingFamilyMemberIds = [
    ...new Set(slots.flatMap((slot) => slot.cookingFamilyMemberIds ?? [])),
  ];
  // One log entry per plan slot per cooking member, plus one snack row per plan day.
  const familyMembers = await tx.familyMember.findMany({
    where: { userId, id: { in: cookingFamilyMemberIds } },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  const uniqueDatesByKey = new Map<string, Date>();
  for (const slot of slots) {
    const dateKey = slot.date.toISOString().slice(0, 10);
    if (!uniqueDatesByKey.has(dateKey)) {
      uniqueDatesByKey.set(dateKey, slot.date);
    }
  }
  const uniquePlanDates = [...uniqueDatesByKey.values()];

  for (const familyMember of familyMembers) {
    for (const slot of slots) {
      await tx.logEntry.create({
        data: {
          logId: log.id,
          date: slot.date,
          mealType: toLogMealType(slot.mealType),
          familyMemberId: familyMember.id,
        },
      });
    }
    for (const date of uniquePlanDates) {
      await tx.logEntry.upsert({
        where: {
          logId_date_mealType_familyMemberId: {
            logId: log.id,
            date,
            mealType: LogMealType.SNACK,
            familyMemberId: familyMember.id,
          },
        },
        update: {},
        create: {
          logId: log.id,
          date,
          mealType: LogMealType.SNACK,
          familyMemberId: familyMember.id,
        },
      });
    }
  }

  return log.id;
}

/** Plan slot IDs this family member has already logged for the plan. */
export async function getPlanSlotIdsLinkedToMember(params: {
  planId: string;
  familyMemberId: string;
  tx?: Prisma.TransactionClient;
}): Promise<Set<string>> {
  const client = params.tx ?? prisma;
  const rows = await client.logEntryRecipe.findMany({
    where: {
      planSlotId: { not: null },
      entry: {
        log: { planId: params.planId },
        familyMemberId: params.familyMemberId,
      },
    },
    select: { planSlotId: true },
  });
  return new Set(
    rows
      .map((row) => row.planSlotId)
      .filter((id): id is string => id != null),
  );
}

/** Track-tab guard: slot must not be Manage-skipped and not already logged by this person. */
export async function assertPlanSlotAvailableForMemberTx(params: {
  tx: Prisma.TransactionClient;
  planId: string;
  planSlotId: string;
  familyMemberId: string;
}): Promise<void> {
  const slot = await params.tx.planSlot.findFirst({
    where: {
      id: params.planSlotId,
      planId: params.planId,
    },
    select: { id: true, used: true },
  });
  if (!slot || slot.used) {
    throw new Error("NO_UNUSED_PLAN_SLOT");
  }

  const alreadyLinked = await params.tx.logEntryRecipe.findFirst({
    where: {
      planSlotId: params.planSlotId,
      entry: {
        log: { planId: params.planId },
        familyMemberId: params.familyMemberId,
      },
    },
    select: { id: true },
  });
  if (alreadyLinked) {
    throw new Error("NO_UNUSED_PLAN_SLOT");
  }
}

export async function getPlannerPoolItemsForPlan(params: {
  userId: string;
  planId: string;
  familyMemberId: string;
}): Promise<PlannerPoolItem[]> {
  const [slots, familyMembers, linkedSlotIds] = await Promise.all([
    getPlanById(params.userId, params.planId),
    prisma.familyMember.findMany({
      where: { userId: params.userId },
      select: { id: true, isSelf: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPlanSlotIdsLinkedToMember({
      planId: params.planId,
      familyMemberId: params.familyMemberId,
    }),
  ]);
  if (!slots) return [];

  // Pool = Manage-tab skips (global `used`) plus per-person log linkage.
  const items: PlannerPoolItem[] = [];
  for (const slot of slots) {
    if (slot.used) {
      continue;
    }

    if (slot.id && linkedSlotIds.has(slot.id)) {
      continue;
    }

    const hasRecipe = slot.recipe != null;
    const hasCustom = slot.customMeal != null;
    if (!hasRecipe && !hasCustom) {
      continue;
    }

    if (!slot.id) {
      continue;
    }

    const dayKey = slot.date.toISOString().slice(0, 10);
    const mealType = toLogMealType(slot.mealType);

    if (hasRecipe && slot.recipe) {
      items.push({
        id: `plan-${slot.id}`,
        planSlotId: slot.id,
        date: slot.date,
        mealType,
        title: slot.recipe.name,
        sourceRecipeId: slot.recipe.id,
        imageUrl: getRecipeDisplayImageUrl(slot.recipe.images),
        ingredients: slot.recipe.ingredients
          .map((ri) => {
            const personAmount = getFamilyMemberIngredientAmountPerMeal({
              amount: ri.amount,
              appliesToEveryone: ri.appliesToEveryone,
              targetFamilyMemberIds: ri.memberTargets.map(
                (target) => target.familyMemberId,
              ),
              familyMemberId: params.familyMemberId,
              recipeServings: slot.recipe!.servings,
              familyMembers,
              memberPortions: slot.recipe!.memberPortions,
              cookingFamilyMemberIds: slot.cookingFamilyMemberIds,
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
      continue;
    }

    if (hasCustom && slot.customMeal) {
      items.push({
        id: `plan-${slot.id}`,
        planSlotId: slot.id,
        date: slot.date,
        mealType,
        title: slot.customMeal.name,
        sourceRecipeId: null,
        imageUrl: null,
        ingredients: slot.customMeal.ingredients
          .filter(
            (row): row is PlannerPoolIngredientRow =>
              row.ingredientId != null &&
              row.unitId != null &&
              row.amount != null &&
              row.amount > 0,
          )
          .map((row) => ({
            ingredientId: row.ingredientId,
            unitId: row.unitId!,
            amount: row.amount!,
          })),
      });
    }
  }

  return items.sort((a, b) => {
    const dayCmp = a.date.toISOString().localeCompare(b.date.toISOString());
    if (dayCmp !== 0) return dayCmp;
    return a.mealType.localeCompare(b.mealType);
  });
}

/** FIFO plan slot for recipe-page add-to-log; per-person, does not toggle global `used`. */
export async function reserveNextUnusedPlanSlotTx(params: {
  tx: Prisma.TransactionClient;
  planId: string;
  recipeId: string;
  familyMemberId: string;
}): Promise<string | null> {
  const linkedSlotIds = await getPlanSlotIdsLinkedToMember({
    planId: params.planId,
    familyMemberId: params.familyMemberId,
    tx: params.tx,
  });

  const slot = await params.tx.planSlot.findFirst({
    where: {
      planId: params.planId,
      recipeId: params.recipeId,
      used: false,
      ...(linkedSlotIds.size > 0 ? { id: { notIn: [...linkedSlotIds] } } : {}),
    },
    orderBy: [{ date: "asc" }, { mealType: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  return slot?.id ?? null;
}

/** FIFO for plan idea meals (custom name only); per-person, does not toggle global `used`. */
export async function reserveNextUnusedPlanSlotByCustomNameTx(params: {
  tx: Prisma.TransactionClient;
  planId: string;
  customName: string;
  familyMemberId: string;
}): Promise<string | null> {
  const linkedSlotIds = await getPlanSlotIdsLinkedToMember({
    planId: params.planId,
    familyMemberId: params.familyMemberId,
    tx: params.tx,
  });

  const slot = await params.tx.planSlot.findFirst({
    where: {
      planId: params.planId,
      recipeId: null,
      customName: params.customName,
      used: false,
      ...(linkedSlotIds.size > 0 ? { id: { notIn: [...linkedSlotIds] } } : {}),
    },
    orderBy: [{ date: "asc" }, { mealType: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  return slot?.id ?? null;
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
  userId: string,
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
    const existingPlan = await tx.plan.findFirst({
      where: { id: planId, userId },
      include: {
        log: { select: { id: true } },
        slots: {
          select: {
            date: true,
            recipeId: true,
            customName: true,
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
      userId,
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
      (slot) =>
        removedDateKeys.includes(toDateKey(slot.date)) &&
        (slot.recipeId != null || slot.customName != null),
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
          create: slots.map((s) => slotSaveDataToCreateData(s)),
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
      const familyMembers = await tx.familyMember.findMany({
        where: { userId },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      });

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
        for (const familyMember of familyMembers) {
          for (const mealType of mealTypes) {
            await tx.logEntry.upsert({
              where: {
                logId_date_mealType_familyMemberId: {
                  logId,
                  date,
                  mealType,
                  familyMemberId: familyMember.id,
                },
              },
              update: {},
              create: {
                logId,
                date,
                mealType,
                familyMemberId: familyMember.id,
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
  userId: string,
  planId: string,
): Promise<
  | { type: "success"; logId: string }
  | { type: "date_conflict"; dates: string[] }
  | { type: "already_exists"; logId: string }
> {
  const slots = await getPlanById(userId, planId);
  if (!slots) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const planDateKeys = [...new Set(slots.map((slot) => slot.date.toISOString().slice(0, 10)))].sort();
  const minDate = new Date(`${planDateKeys[0]}T00:00:00.000Z`);
  const maxDate = new Date(`${planDateKeys[planDateKeys.length - 1]}T23:59:59.999Z`);
  const planDateKeySet = new Set(planDateKeys);

  const existingEntries = await prisma.logEntry.findMany({
    where: {
      log: { plan: { userId } },
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
      (tx) => createBaselineLogTx(tx, userId, planId, slots),
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
