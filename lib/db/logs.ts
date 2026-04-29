import { cache } from "react";
import {
  LogMealType,
  LogPerson,
  PlannerMealType,
  Prisma,
} from "@/src/generated/client";
import { prisma } from "./index";
import {
  findDateCollisionsTx,
  releaseReservedPlanSlotTx,
  reserveNextUnusedPlanSlotTx,
} from "./planner";
import type {
  ParsedAddRecipeToLogInput,
  PlacePlannerPoolItemInput,
  ClearLogEntryAssignmentInput,
  DuplicateLogEntryInput,
  UpsertLogSlotInput,
  UpdateLogRecipeIngredientsInput,
} from "@/lib/validations/log";

/** Release every plan slot reserved by this entry’s recipes (avoids orphaned `used` slots). */
async function releasePlanSlotsLinkedToEntryRecipes(
  tx: Prisma.TransactionClient,
  entryId: string,
) {
  const rows = await tx.logEntryRecipe.findMany({
    where: { entryId },
    select: { planSlotId: true },
  });
  const released = new Set<string>();
  for (const row of rows) {
    if (row.planSlotId && !released.has(row.planSlotId)) {
      released.add(row.planSlotId);
      await releaseReservedPlanSlotTx({
        tx,
        planSlotId: row.planSlotId,
      });
    }
  }
}

export async function getLogs() {
  return prisma.log.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      plan: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });
}

/** Dedupes within a single RSC request when layout and data loaders both need the list. */
export const getLogsCached = cache(getLogs);

export type LogListEntry = Awaited<ReturnType<typeof getLogs>>[number];

/** Log whose plan range contains the given calendar day (UTC date keys), if any. */
export function findLogContainingDate(
  logs: LogListEntry[],
  date: Date,
): LogListEntry | undefined {
  const targetKey = date.toISOString().slice(0, 10);
  return logs.find((log) => {
    const startKey = log.plan.startDate.toISOString().slice(0, 10);
    const endKey = log.plan.endDate.toISOString().slice(0, 10);
    return targetKey >= startKey && targetKey <= endKey;
  });
}

export async function deleteLogById(logId: string) {
  await prisma.log.delete({
    where: { id: logId },
  });
}

export async function getLogById(logId: string, person: LogPerson) {
  return prisma.log.findUnique({
    where: { id: logId },
    select: {
      id: true,
      createdAt: true,
      plan: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
        },
      },
      entries: {
        where: { person },
        orderBy: [{ date: "asc" }, { mealType: "asc" }],
        select: {
          id: true,
          date: true,
          mealType: true,
          person: true,
          recipes: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              planSlotId: true,
              sourceRecipe: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: {
                    where: { isCover: true },
                    select: { url: true },
                    take: 1,
                  },
                },
              },
            },
          },
          ingredients: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              entryRecipeId: true,
              amount: true,
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  calories: true,
                  proteins: true,
                  fats: true,
                  carbs: true,
                  unitConversions: {
                    select: {
                      unitId: true,
                      gramsPerUnit: true,
                    },
                  },
                },
              },
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
    },
  });
}

export async function getLogByPlanId(planId: string, person: LogPerson) {
  const log = await prisma.log.findUnique({
    where: { planId },
    select: { id: true },
  });
  if (!log) {
    return null;
  }
  return getLogById(log.id, person);
}

export type AppendNextLogDayResult =
  | {
      type: "success";
      dateKey: string;
      planId: string;
    }
  | {
      type: "date_conflict";
      dates: string[];
      conflictingLogIds: string[];
      conflictingPlanIds: string[];
    };

export async function appendNextLogDay(input: { logId: string }): Promise<AppendNextLogDayResult> {
  return prisma.$transaction(async (tx) => {
    const log = await tx.log.findUnique({
      where: { id: input.logId },
      select: {
        id: true,
        plan: {
          select: {
            id: true,
            endDate: true,
          },
        },
      },
    });

    if (!log) {
      throw new Error("LOG_NOT_FOUND");
    }

    const latestEntry = await tx.logEntry.findFirst({
      where: { logId: input.logId },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    const baseDate = latestEntry?.date ?? log.plan.endDate;
    const nextDate = new Date(
      Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() + 1,
      ),
    );
    const nextDateKey = nextDate.toISOString().slice(0, 10);
    // Block collisions with any other plan/log owner for the target day.
    const dateCollision = await findDateCollisionsTx({
      tx,
      dateKeys: [nextDateKey],
      excludePlanId: log.plan.id,
      excludeLogId: log.id,
    });
    if (dateCollision.dates.length > 0) {
      return {
        type: "date_conflict",
        dates: dateCollision.dates,
        conflictingLogIds: dateCollision.conflictingLogIds,
        conflictingPlanIds: dateCollision.conflictingPlanIds,
      };
    }

    const logMealTypes = [
      LogMealType.BREAKFAST,
      LogMealType.LUNCH,
      LogMealType.SNACK,
      LogMealType.DINNER,
    ] as const;
    const plannerMealTypes = [
      PlannerMealType.BREAKFAST,
      PlannerMealType.LUNCH,
      PlannerMealType.DINNER,
    ] as const;
    const people = [LogPerson.PRIMARY, LogPerson.SECONDARY] as const;

    for (const person of people) {
      for (const mealType of logMealTypes) {
        await tx.logEntry.upsert({
          where: {
            logId_date_mealType_person: {
              logId: input.logId,
              date: nextDate,
              mealType,
              person,
            },
          },
          update: {},
          create: {
            logId: input.logId,
            date: nextDate,
            mealType,
            person,
          },
        });
      }
    }
    // Keep planner dates aligned with manually-added log days.
    await tx.planSlot.createMany({
      data: plannerMealTypes.map((mealType) => ({
        planId: log.plan.id,
        date: nextDate,
        mealType,
        recipeId: null,
        used: false,
      })),
    });
    if (nextDate > log.plan.endDate) {
      await tx.plan.update({
        where: { id: log.plan.id },
        data: { endDate: nextDate },
      });
    }

    return { type: "success", dateKey: nextDateKey, planId: log.plan.id };
  });
}

type RemoveDayImpact = {
  impactedDates: string[];
  impactedLogMealsCount: number;
  impactedPlanMealsCount: number;
};

export type RemoveLogDayResult =
  | { type: "success"; nextDayKey: string | null }
  | ({ type: "impact_warning" } & RemoveDayImpact);

export async function removeLogDay(input: {
  logId: string;
  dateKey: string;
  force?: boolean;
}): Promise<RemoveLogDayResult> {
  return prisma.$transaction(async (tx) => {
    const distinctDays = await tx.logEntry.findMany({
      where: { logId: input.logId },
      distinct: ["date"],
      orderBy: { date: "asc" },
      select: { date: true },
    });

    if (distinctDays.length <= 1) {
      throw new Error("CANNOT_REMOVE_LAST_LOG_DAY");
    }

    const targetDate = new Date(`${input.dateKey}T00:00:00.000Z`);
    const logWithPlan = await tx.log.findUnique({
      where: { id: input.logId },
      select: { planId: true },
    });
    if (!logWithPlan) {
      throw new Error("LOG_NOT_FOUND");
    }

    // Impact on the log side: any non-empty meal entry (has recipe or ingredients).
    const nonEmptyLogEntries = await tx.logEntry.findMany({
      where: {
        logId: input.logId,
        date: targetDate,
        OR: [{ recipes: { some: {} } }, { ingredients: { some: {} } }],
      },
      select: { id: true },
    });

    // Impact on the plan side: any planned slot (recipe assigned) on that date.
    const impactedPlanMealsCount = await tx.planSlot.count({
      where: {
        planId: logWithPlan.planId,
        date: targetDate,
        recipeId: { not: null },
      },
    });

    const impactedLogMealsCount = nonEmptyLogEntries.length;
    const hasImpact = impactedLogMealsCount > 0 || impactedPlanMealsCount > 0;
    if (hasImpact && !input.force) {
      return {
        type: "impact_warning",
        impactedDates: [input.dateKey],
        impactedLogMealsCount,
        impactedPlanMealsCount,
      };
    }

    await tx.logEntry.deleteMany({
      where: {
        logId: input.logId,
        date: targetDate,
      },
    });
    // Keep planner dates synced with log date removals.
    await tx.planSlot.deleteMany({
      where: {
        planId: logWithPlan.planId,
        date: targetDate,
      },
    });

    const remainingPlanBounds = await tx.planSlot.aggregate({
      where: { planId: logWithPlan.planId },
      _min: { date: true },
      _max: { date: true },
    });
    if (remainingPlanBounds._min.date && remainingPlanBounds._max.date) {
      await tx.plan.update({
        where: { id: logWithPlan.planId },
        data: {
          startDate: remainingPlanBounds._min.date,
          endDate: remainingPlanBounds._max.date,
        },
      });
    }

    const remainingDays = await tx.logEntry.findMany({
      where: { logId: input.logId },
      distinct: ["date"],
      orderBy: { date: "asc" },
      select: { date: true },
    });

    return {
      type: "success",
      nextDayKey: remainingDays[0]?.date.toISOString().slice(0, 10) ?? null,
    };
  });
}

export async function updateLogRecipeIngredients(
  input: UpdateLogRecipeIngredientsInput,
) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.logEntry.findFirst({
      where: {
        id: input.entryId,
        logId: input.logId,
        person: input.person,
      },
      select: { id: true },
    });

    if (!entry) {
      throw new Error("LOG_ENTRY_NOT_FOUND");
    }

    const entryRecipe = await tx.logEntryRecipe.findFirst({
      where: {
        id: input.entryRecipeId,
        entryId: input.entryId,
      },
      select: { id: true },
    });

    if (!entryRecipe) {
      throw new Error("ENTRY_RECIPE_NOT_FOUND");
    }

    const log = await tx.log.findUnique({
      where: { id: input.logId },
      select: { planId: true },
    });
    if (!log) {
      throw new Error("LOG_NOT_FOUND");
    }

    await assertIngredientRowsHaveSupportedUnits(tx, input.ingredients);

    await tx.logIngredient.deleteMany({
      where: {
        entryId: input.entryId,
        entryRecipeId: input.entryRecipeId,
      },
    });

    if (input.ingredients.length > 0) {
      await tx.logIngredient.createMany({
        data: input.ingredients.map((row) => ({
          entryId: input.entryId,
          entryRecipeId: input.entryRecipeId,
          ingredientId: row.ingredientId,
          amount: row.amount,
          unitId: row.unitId,
        })),
      });
    }
  });
}

export async function upsertLogSlot(input: UpsertLogSlotInput) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.logEntry.findFirst({
      where: {
        id: input.entryId,
        logId: input.logId,
        person: input.person,
      },
      select: { id: true },
    });

    if (!entry) {
      throw new Error("LOG_ENTRY_NOT_FOUND");
    }

    const log = await tx.log.findUnique({
      where: { id: input.logId },
      select: { planId: true },
    });
    if (!log) {
      throw new Error("LOG_NOT_FOUND");
    }

    await assertIngredientRowsHaveSupportedUnits(tx, input.ingredients);

    await releasePlanSlotsLinkedToEntryRecipes(tx, input.entryId);

    await tx.logIngredient.deleteMany({
      where: {
        entryId: input.entryId,
      },
    });

    await tx.logEntryRecipe.deleteMany({
      where: {
        entryId: input.entryId,
      },
    });

    let nextEntryRecipeId: string | null = null;
    if (input.recipeId) {
      const createdRecipe = await tx.logEntryRecipe.create({
        data: {
          entryId: input.entryId,
          sourceRecipeId: input.recipeId,
          position: 0,
        },
        select: { id: true },
      });
      nextEntryRecipeId = createdRecipe.id;
    }

    if (input.ingredients.length > 0) {
      await tx.logIngredient.createMany({
        data: input.ingredients.map((row) => ({
          entryId: input.entryId,
          entryRecipeId: nextEntryRecipeId,
          ingredientId: row.ingredientId,
          amount: row.amount,
          unitId: row.unitId,
        })),
      });
    }
  });
}

export async function placePlannerPoolItemInEntry(input: PlacePlannerPoolItemInput) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.logEntry.findFirst({
      where: {
        id: input.entryId,
        logId: input.logId,
        person: input.person,
      },
      select: { id: true },
    });

    if (!entry) {
      throw new Error("LOG_ENTRY_NOT_FOUND");
    }

    const log = await tx.log.findUnique({
      where: { id: input.logId },
      select: { planId: true },
    });
    if (!log) {
      throw new Error("LOG_NOT_FOUND");
    }

    await assertIngredientRowsHaveSupportedUnits(tx, input.ingredients);

    await releasePlanSlotsLinkedToEntryRecipes(tx, input.entryId);

    const reservedPlanSlotId = await reserveNextUnusedPlanSlotTx({
      tx,
      planId: log.planId,
      recipeId: input.sourceRecipeId,
    });
    if (!reservedPlanSlotId) {
      throw new Error("NO_UNUSED_PLAN_SLOT_FOR_RECIPE");
    }

    await tx.logIngredient.deleteMany({
      where: {
        entryId: input.entryId,
      },
    });

    await tx.logEntryRecipe.deleteMany({
      where: {
        entryId: input.entryId,
      },
    });

    const entryRecipe = await tx.logEntryRecipe.create({
      data: {
        entryId: input.entryId,
        sourceRecipeId: input.sourceRecipeId,
        planSlotId: reservedPlanSlotId,
        position: 0,
      },
      select: { id: true },
    });

    if (input.ingredients.length > 0) {
      await tx.logIngredient.createMany({
        data: input.ingredients.map((row) => ({
          entryId: input.entryId,
          entryRecipeId: entryRecipe.id,
          ingredientId: row.ingredientId,
          amount: row.amount,
          unitId: row.unitId,
        })),
      });
    }
  });
}

export async function clearLogEntryAssignment(input: ClearLogEntryAssignmentInput) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.logEntry.findFirst({
      where: {
        id: input.entryId,
        logId: input.logId,
        person: input.person,
      },
      select: { id: true },
    });

    if (!entry) {
      throw new Error("LOG_ENTRY_NOT_FOUND");
    }

    await releasePlanSlotsLinkedToEntryRecipes(tx, input.entryId);

    await tx.logIngredient.deleteMany({
      where: {
        entryId: input.entryId,
      },
    });

    await tx.logEntryRecipe.deleteMany({
      where: {
        entryId: input.entryId,
      },
    });
  });
}

export async function duplicateLogEntryToDay(input: DuplicateLogEntryInput) {
  await prisma.$transaction(async (tx) => {
    const sourceEntry = await tx.logEntry.findFirst({
      where: {
        id: input.sourceEntryId,
        logId: input.logId,
        person: input.person,
      },
      select: { id: true },
    });
    if (!sourceEntry) {
      throw new Error("LOG_ENTRY_NOT_FOUND");
    }

    const targetDate = new Date(`${input.targetDay}T00:00:00.000Z`);
    const targetEntry = await tx.logEntry.findFirst({
      where: {
        logId: input.logId,
        person: input.person,
        date: targetDate,
        mealType: input.targetMealType,
      },
      select: { id: true },
    });
    if (!targetEntry) {
      throw new Error("TARGET_LOG_ENTRY_NOT_FOUND");
    }

    const log = await tx.log.findUnique({
      where: { id: input.logId },
      select: { planId: true },
    });
    if (!log) {
      throw new Error("LOG_NOT_FOUND");
    }

    await assertIngredientRowsHaveSupportedUnits(tx, input.ingredients);
    await releasePlanSlotsLinkedToEntryRecipes(tx, targetEntry.id);

    let reservedPlanSlotId: string | null = null;
    if (input.sourceRecipeId) {
      // Preferred path: consume pool exactly like drag-from-pool when capacity exists.
      reservedPlanSlotId = await reserveNextUnusedPlanSlotTx({
        tx,
        planId: log.planId,
        recipeId: input.sourceRecipeId,
      });
      // If no unused slot exists, still duplicate as a recipe-backed entry without pool impact.
      // This supports batch-cook/customized copies beyond planned pool count.
    }

    await tx.logIngredient.deleteMany({
      where: {
        entryId: targetEntry.id,
      },
    });

    await tx.logEntryRecipe.deleteMany({
      where: {
        entryId: targetEntry.id,
      },
    });

    let targetEntryRecipeId: string | null = null;
    if (input.sourceRecipeId) {
      const targetRecipe = await tx.logEntryRecipe.create({
        data: {
          entryId: targetEntry.id,
          sourceRecipeId: input.sourceRecipeId,
          planSlotId: reservedPlanSlotId ?? undefined,
          position: 0,
        },
        select: { id: true },
      });
      targetEntryRecipeId = targetRecipe.id;
    }

    if (input.ingredients.length > 0) {
      await tx.logIngredient.createMany({
        data: input.ingredients.map((row) => ({
          entryId: targetEntry.id,
          entryRecipeId: targetEntryRecipeId,
          ingredientId: row.ingredientId,
          amount: row.amount,
          unitId: row.unitId,
        })),
      });
    }
  });
}

async function assertIngredientRowsHaveSupportedUnits(
  tx: Prisma.TransactionClient,
  rows: Array<{ ingredientId: string; unitId: string }>,
) {
  const ingredientIds = [...new Set(rows.map((row) => row.ingredientId))];
  const ingredients = await tx.ingredient.findMany({
    where: { id: { in: ingredientIds } },
    select: {
      id: true,
      unitConversions: {
        select: {
          unitId: true,
        },
      },
    },
  });
  const ingredientById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );

  for (const row of rows) {
    const ingredient = ingredientById.get(row.ingredientId);
    if (!ingredient) {
      throw new Error("INGREDIENT_NOT_FOUND");
    }

    const supportsUnit = ingredient.unitConversions.some(
      (conversion) => conversion.unitId === row.unitId,
    );
    if (!supportsUnit) {
      throw new Error("UNIT_NOT_ALLOWED_FOR_INGREDIENT");
    }
  }
}

/**
 * Log `?day=YYYY-MM-DD` and `buildLogDays` dateKey use `date.toISOString().slice(0, 10)` (UTC).
 * `new Date(d).setHours(0,0,0,0)` uses *local* midnight and can shift the UTC calendar day,
 * so the entry lands on the wrong PostgreSQL DATE vs the picker value.
 */
function utcCalendarDateForLogEntry(value: Date | string): Date {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (match) {
      const y = Number(match[1]);
      const m = Number(match[2]) - 1;
      const d = Number(match[3]);
      return new Date(Date.UTC(y, m, d));
    }
  }
  const v = value instanceof Date ? value : new Date(value);
  return new Date(
    Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()),
  );
}

export async function replaceMealSlotWithRecipe(input: ParsedAddRecipeToLogInput) {
  return prisma.$transaction(async (tx) => {
    const date = utcCalendarDateForLogEntry(input.date);

    const activeLog = await tx.log.findFirst({
      where: {
        plan: {
          startDate: {
            lte: date,
          },
          endDate: {
            gte: date,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        planId: true,
      },
    });
    if (!activeLog) {
      throw new Error("ACTIVE_LOG_NOT_FOUND_FOR_DATE");
    }

    await assertIngredientRowsHaveSupportedUnits(tx, input.ingredients);

    const entry = await tx.logEntry.upsert({
      where: {
        logId_date_mealType_person: {
          logId: activeLog.id,
          date,
          mealType: input.mealType,
          person: input.person,
        },
      },
      update: {},
      create: {
        logId: activeLog.id,
        date,
        mealType: input.mealType,
        person: input.person,
      },
      select: {
        id: true,
      },
    });

    await releasePlanSlotsLinkedToEntryRecipes(tx, entry.id);

    await tx.logIngredient.deleteMany({
      where: {
        entryId: entry.id,
      },
    });
    await tx.logEntryRecipe.deleteMany({
      where: {
        entryId: entry.id,
      },
    });

    // Keep planner/log counts in sync: one recipe-page add consumes one planned instance (FIFO).
    const reservedPlanSlotId =
      input.mealType === LogMealType.SNACK
        ? null
        : await reserveNextUnusedPlanSlotTx({
            tx,
            planId: activeLog.planId,
            recipeId: input.recipeId,
          });

    const createdRecipe = await tx.logEntryRecipe.create({
      data: {
        entryId: entry.id,
        sourceRecipeId: input.recipeId,
        planSlotId: reservedPlanSlotId ?? undefined,
        position: 0,
      },
      select: {
        id: true,
      },
    });

    if (input.ingredients.length > 0) {
      await tx.logIngredient.createMany({
        data: input.ingredients.map((row) => ({
          entryId: entry.id,
          entryRecipeId: createdRecipe.id,
          ingredientId: row.ingredientId,
          amount: row.amount,
          unitId: row.unitId,
        })),
      });
    }

    return { logId: activeLog.id };
  });
}
