import { LogPerson, Prisma } from "@/src/generated/client";
import { prisma } from "./index";
import type {
  ParsedAddRecipeToLogInput,
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

export async function replaceMealSlotWithRecipe(input: ParsedAddRecipeToLogInput) {
  return prisma.$transaction(async (tx) => {
    const date = new Date(input.date);
    date.setHours(0, 0, 0, 0);

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
