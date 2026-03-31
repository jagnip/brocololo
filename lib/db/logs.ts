import { LogMealType, LogPerson, Prisma } from "@/src/generated/client";
import { prisma } from "./index";
import {
  releaseReservedPlanSlotTx,
  reserveNextUnusedPlanSlotTx,
} from "./planner";
import type {
  ParsedAddRecipeToLogInput,
  PlacePlannerPoolItemInput,
  ClearLogEntryAssignmentInput,
  UpsertLogSlotInput,
  UpdateLogRecipeIngredientsInput,
} from "@/lib/validations/log";

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

export async function appendNextLogDay(input: { logId: string }) {
  return prisma.$transaction(async (tx) => {
    const log = await tx.log.findUnique({
      where: { id: input.logId },
      select: {
        id: true,
        plan: {
          select: {
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

    const mealTypes = [
      LogMealType.BREAKFAST,
      LogMealType.LUNCH,
      LogMealType.SNACK,
      LogMealType.DINNER,
    ] as const;
    const people = [LogPerson.PRIMARY, LogPerson.SECONDARY] as const;

    for (const person of people) {
      for (const mealType of mealTypes) {
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

    return { dateKey: nextDate.toISOString().slice(0, 10) };
  });
}

export async function removeLogDay(input: { logId: string; dateKey: string }) {
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
    await tx.logEntry.deleteMany({
      where: {
        logId: input.logId,
        date: targetDate,
      },
    });

    const remainingDays = await tx.logEntry.findMany({
      where: { logId: input.logId },
      distinct: ["date"],
      orderBy: { date: "asc" },
      select: { date: true },
    });

    return {
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

    const existingRecipeForEntry = await tx.logEntryRecipe.findFirst({
      where: {
        entryId: input.entryId,
      },
      select: { planSlotId: true },
    });

    if (existingRecipeForEntry?.planSlotId) {
      await releaseReservedPlanSlotTx({
        tx,
        planSlotId: existingRecipeForEntry.planSlotId,
      });
    }

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

    const existingRecipeForEntry = await tx.logEntryRecipe.findFirst({
      where: {
        entryId: input.entryId,
      },
      select: { planSlotId: true },
    });

    if (existingRecipeForEntry?.planSlotId) {
      await releaseReservedPlanSlotTx({
        tx,
        planSlotId: existingRecipeForEntry.planSlotId,
      });
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

    const createdRecipe = await tx.logEntryRecipe.create({
      data: {
        entryId: entry.id,
        sourceRecipeId: input.recipeId,
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
