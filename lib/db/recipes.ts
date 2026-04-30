import {
  CreateRecipePayload,
  UpdateRecipePayload,
} from "../validations/recipe";
import { prisma } from "./index";
import { Prisma } from "@/src/generated/client";
import { CategoryType } from "@/src/generated/enums";
import type { RecipeType } from "@/types/recipe";

const recipeInclude = {
  categories: {
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
    },
  },
  ingredientGroups: {
    orderBy: { position: "asc" as const },
  },
  ingredients: {
    orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
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
                  namePlural: true,
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
                          namePlural: true,
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
} satisfies Prisma.RecipeInclude;

export async function getRecipeBySlug(slug: string): Promise<RecipeType | null> {
  return await prisma.recipe.findUnique({
    where: { slug },
    include: recipeInclude,
  });
}

export async function getRecipes(
  occasion?: string,
  q?: string,
  excludeFromPlanner?: boolean,
  filters?: {
    proteinSlug?: string;
    typeSlug?: string;
    handsOnTimeMax?: number;
  },
): Promise<RecipeType[]> {
  // Build category filters as explicit AND conditions so none overwrite each other.
  const categoryConditions: Prisma.RecipeWhereInput[] = [
    ...(occasion
      ? [
          {
            categories: {
              some: { slug: occasion, type: CategoryType.MEAL_OCCASION },
            },
          },
        ]
      : []),
    ...(filters?.proteinSlug
      ? [{ categories: { some: { slug: filters.proteinSlug } } }]
      : []),
    ...(filters?.typeSlug
      ? [{ categories: { some: { slug: filters.typeSlug } } }]
      : []),
  ];

  const recipes = await prisma.recipe.findMany({
    where: {
      ...(categoryConditions.length > 0 ? { AND: categoryConditions } : {}),
      ...(filters?.handsOnTimeMax !== undefined
        ? { handsOnTime: { lte: filters.handsOnTimeMax } }
        : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(excludeFromPlanner !== undefined
        ? { excludeFromPlanner }
        : {}),
    },
    include: recipeInclude,
    orderBy: {
      handsOnTime: "asc",
    },
  });
  // Prisma inference can degrade to scalar-only shape with complex conditional `where` spreads.
  return recipes as RecipeType[];
}

async function validateAndBuildCategoryIds(input: {
  mealOccasionCategoryIds?: string[];
  proteinCategoryId?: string | null;
  typeCategoryId?: string | null;
}): Promise<string[]> {
  const mealOccasionCategoryIds = input.mealOccasionCategoryIds ?? [];
  const selectedIds = [
    ...mealOccasionCategoryIds,
    input.proteinCategoryId ?? null,
    input.typeCategoryId ?? null,
  ].filter((id): id is string => Boolean(id));

  const uniqueCategoryIds = [...new Set(selectedIds)];

  const categories = await prisma.category.findMany({
    where: {
      id: { in: uniqueCategoryIds },
    },
    select: {
      id: true,
      slug: true,
      type: true,
    },
  });

  if (categories.length !== uniqueCategoryIds.length) {
    throw new Error("Invalid category selection");
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const mealOccasionCategories = mealOccasionCategoryIds
    .map((id) => categoryById.get(id))
    .filter(
      (category): category is { id: string; slug: string; type: CategoryType } =>
        category != null,
    );
  if (mealOccasionCategories.length !== mealOccasionCategoryIds.length) {
    throw new Error("Invalid meal occasion category selection");
  }
  if (mealOccasionCategories.some((category) => category.type !== "MEAL_OCCASION")) {
    throw new Error("Invalid meal occasion category");
  }

  const protein = input.proteinCategoryId
    ? categoryById.get(input.proteinCategoryId)
    : null;
  if (protein && protein.type !== "PROTEIN") {
    throw new Error("Invalid protein category");
  }

  const recipeType = input.typeCategoryId
    ? categoryById.get(input.typeCategoryId)
    : null;
  if (recipeType) {
    if (recipeType.type !== "RECIPE_TYPE") {
      throw new Error("Invalid recipe type category");
    }
  }

  return uniqueCategoryIds;
}


export async function createRecipe(data: CreateRecipePayload & { slug: string }) {
  const {
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
    ingredientGroups,
    ingredients,
    instructions,
    images,
    ...recipeData
  } = data;
  const categories = await validateAndBuildCategoryIds({
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
  });
  // Keep positions deterministic and unique even if client submits duplicates.
  const normalizedGroups = [...ingredientGroups]
    .sort((a, b) => a.position - b.position)
    .map((group, index) => ({
      ...group,
      position: index,
    }));

  const recipeId = await prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.create({
      data: {
        ...recipeData,
        categories: {
          connect: categories.map((categoryId) => ({ id: categoryId })),
        },
        images: {
          create: images.map((img) => ({
            url: img.url,
            isCover: img.isCover,
          })),
        },
      },
      select: { id: true },
    });

    const groupIdByTempKey = new Map<string, string>();
    for (const group of normalizedGroups) {
      const createdGroup = await tx.recipeIngredientGroup.create({
        data: {
          recipeId: recipe.id,
          name: group.name,
          position: group.position,
        },
        select: { id: true },
      });
      groupIdByTempKey.set(group.tempGroupKey, createdGroup.id);
    }

    const ingredientIdByTempKey = new Map<string, string>();

    for (const ing of ingredients) {
      const created = await tx.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          groupId: ing.groupTempKey
            ? (groupIdByTempKey.get(ing.groupTempKey) ?? null)
            : null,
          position: ing.position,
          ingredientId: ing.ingredientId,
          amount: ing.amount,
          unitId: ing.unitId,
          nutritionTarget: ing.nutritionTarget,
          additionalInfo: ing.additionalInfo,
        },
        select: { id: true },
      });

      ingredientIdByTempKey.set(ing.tempIngredientKey, created.id);
    }

    for (let position = 0; position < instructions.length; position += 1) {
      const step = instructions[position];
      const createdStep = await tx.recipeInstruction.create({
        data: {
          recipeId: recipe.id,
          position,
          text: step.text,
        },
        select: { id: true },
      });

      const linkRows = step.linkedTempIngredientKeys
        .map((key) => ingredientIdByTempKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((recipeIngredientId) => ({
          instructionId: createdStep.id,
          recipeIngredientId,
        }));

      if (linkRows.length > 0) {
        await tx.recipeInstructionIngredient.createMany({
          data: linkRows,
          skipDuplicates: true,
        });
      }
    }

    // Keep the transaction focused on writes and return only the created ID.
    return recipe.id;
  }, {
    // Temporary hotfix: give larger writes more headroom.
    // TODO: Reduce in-transaction sequential work and lower this again.
    maxWait: 10000,
    timeout: 30000,
  });

  // Fetching the fully expanded payload after commit shortens transaction lifetime.
  return prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
    include: recipeInclude,
  });
}

export async function updateRecipe(
  recipeId: string,
  data: UpdateRecipePayload & { slug: string }
) {
  const {
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
    ingredientGroups,
    ingredients,
    instructions,
    images,
    ...recipeData
  } = data;
  const categories = await validateAndBuildCategoryIds({
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
  });
  // Keep positions deterministic and unique even if client submits duplicates.
  const normalizedGroups = [...ingredientGroups]
    .sort((a, b) => a.position - b.position)
    .map((group, index) => ({
      ...group,
      position: index,
    }));

  return prisma.$transaction(async (tx) => {
    await tx.recipe.update({
      where: { id: recipeId },
      data: {
        ...recipeData,
        categories: {
          set: categories.map((categoryId) => ({ id: categoryId })),
        },
        images: {
          deleteMany: {},
          create: images.map((img) => ({
            url: img.url,
            isCover: img.isCover,
          })),
        },
      },
    });

    const existingIngredients = await tx.recipeIngredient.findMany({
      where: { recipeId },
      select: { id: true },
    });
    const existingGroups = await tx.recipeIngredientGroup.findMany({
      where: { recipeId },
      select: { id: true },
    });
    const existingGroupIds = new Set(existingGroups.map((group) => group.id));
    const incomingGroupIds = new Set(
      normalizedGroups
        .map((group) => group.id)
        .filter((id): id is string => Boolean(id)),
    );
    const groupIdByTempKey = new Map<string, string>();
    // Avoid transient unique collisions while reordering group positions.
    await tx.recipeIngredientGroup.updateMany({
      where: { recipeId },
      data: {
        position: {
          increment: 10000,
        },
      },
    });

    for (const group of normalizedGroups) {
      if (group.id && existingGroupIds.has(group.id)) {
        await tx.recipeIngredientGroup.update({
          where: { id: group.id },
          data: {
            name: group.name,
            position: group.position,
          },
        });
        groupIdByTempKey.set(group.tempGroupKey, group.id);
      } else {
        const created = await tx.recipeIngredientGroup.create({
          data: {
            recipeId,
            name: group.name,
            position: group.position,
          },
          select: { id: true },
        });
        groupIdByTempKey.set(group.tempGroupKey, created.id);
      }
    }

    const existingIngredientIds = new Set(existingIngredients.map((i) => i.id));
    const incomingIngredientIds = new Set(
      ingredients
        .map((ing) => ing.id)
        .filter((id): id is string => Boolean(id)),
    );

    const ingredientIdByTempKey = new Map<string, string>();
    // Avoid transient unique collisions while reordering within the same group.
    await tx.recipeIngredient.updateMany({
      where: { recipeId },
      data: {
        position: {
          increment: 10000,
        },
      },
    });

    for (const ing of ingredients) {
      const nextGroupId = ing.groupTempKey
        ? (groupIdByTempKey.get(ing.groupTempKey) ?? null)
        : null;
      if (ing.id && existingIngredientIds.has(ing.id)) {
        await tx.recipeIngredient.update({
          where: { id: ing.id },
          data: {
            groupId: nextGroupId,
            position: ing.position,
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unitId: ing.unitId,
            nutritionTarget: ing.nutritionTarget,
            additionalInfo: ing.additionalInfo,
          },
        });
        ingredientIdByTempKey.set(ing.tempIngredientKey, ing.id);
      } else {
        const created = await tx.recipeIngredient.create({
          data: {
            recipeId,
            groupId: nextGroupId,
            position: ing.position,
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unitId: ing.unitId,
            nutritionTarget: ing.nutritionTarget,
            additionalInfo: ing.additionalInfo,
          },
          select: { id: true },
        });
        ingredientIdByTempKey.set(ing.tempIngredientKey, created.id);
      }
    }

    const ingredientIdsToDelete = [...existingIngredientIds].filter(
      (id) => !incomingIngredientIds.has(id),
    );
    if (ingredientIdsToDelete.length > 0) {
      await tx.recipeIngredient.deleteMany({
        where: { id: { in: ingredientIdsToDelete } },
      });
    }

    const groupIdsToDelete = [...existingGroupIds].filter(
      (id) => !incomingGroupIds.has(id),
    );
    if (groupIdsToDelete.length > 0) {
      // Keep data resilient: any straggler rows are moved to ungrouped lane.
      const leftoverGroupedIngredients = await tx.recipeIngredient.findMany({
        where: {
          recipeId,
          groupId: { in: groupIdsToDelete },
        },
        select: { id: true },
      });

      if (leftoverGroupedIngredients.length > 0) {
        const maxUngrouped = await tx.recipeIngredient.aggregate({
          where: { recipeId, groupId: null },
          _max: { position: true },
        });
        let nextPosition = (maxUngrouped._max.position ?? -1) + 1;
        for (const row of leftoverGroupedIngredients) {
          await tx.recipeIngredient.update({
            where: { id: row.id },
            data: {
              groupId: null,
              position: nextPosition,
            },
          });
          nextPosition += 1;
        }
      }

      await tx.recipeIngredientGroup.deleteMany({
        where: { id: { in: groupIdsToDelete } },
      });
    }

    const existingSteps = await tx.recipeInstruction.findMany({
      where: { recipeId },
      select: { id: true },
    });
    const existingStepIds = new Set(existingSteps.map((step) => step.id));
    const incomingStepIds = new Set(
      instructions
        .map((step) => step.id)
        .filter((id): id is string => Boolean(id)),
    );

    for (let position = 0; position < instructions.length; position += 1) {
      const step = instructions[position];
      let stepId: string;

      if (step.id && existingStepIds.has(step.id)) {
        const updated = await tx.recipeInstruction.update({
          where: { id: step.id },
          data: {
            text: step.text,
            position,
          },
          select: { id: true },
        });
        stepId = updated.id;
      } else {
        const created = await tx.recipeInstruction.create({
          data: {
            recipeId,
            text: step.text,
            position,
          },
          select: { id: true },
        });
        stepId = created.id;
      }

      await tx.recipeInstructionIngredient.deleteMany({
        where: { instructionId: stepId },
      });

      const linkRows = step.linkedTempIngredientKeys
        .map((key) => ingredientIdByTempKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((recipeIngredientId) => ({
          instructionId: stepId,
          recipeIngredientId,
        }));

      if (linkRows.length > 0) {
        await tx.recipeInstructionIngredient.createMany({
          data: linkRows,
          skipDuplicates: true,
        });
      }
    }

    const stepIdsToDelete = [...existingStepIds].filter(
      (id) => !incomingStepIds.has(id),
    );
    if (stepIdsToDelete.length > 0) {
      await tx.recipeInstruction.deleteMany({
        where: { id: { in: stepIdsToDelete } },
      });
    }

    return tx.recipe.findUniqueOrThrow({
      where: { id: recipeId },
      include: recipeInclude,
    });
  }, {
    // Temporary hotfix: give larger writes more headroom.
    // TODO: Reduce in-transaction sequential work and lower this again.
    maxWait: 10000,
    timeout: 30000,
  });
}

export async function deleteRecipe(recipeId: string) {
  // Hard-delete recipe; related rows are removed by DB cascades.
  return prisma.recipe.delete({
    where: { id: recipeId },
    select: { id: true },
  });
}