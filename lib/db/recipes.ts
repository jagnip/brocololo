import {
  CreateRecipePayload,
  UpdateRecipePayload,
} from "../validations/recipe";
import { prisma } from "./index";
import { Prisma } from "@/src/generated/client";
import { CategoryType, RecipeIngredientAdjustmentKind } from "@/src/generated/enums";
import type { RecipeIngredientInputType } from "../validations/recipe";

async function syncMemberAdjustments(
  tx: Prisma.TransactionClient,
  recipeIngredientId: string,
  memberAdjustments: RecipeIngredientInputType["memberAdjustments"],
  ownedFamilyMemberIdSet: Set<string>,
) {
  await tx.recipeIngredientMemberAdjustment.deleteMany({
    where: { recipeIngredientId },
  });

  const rows = (memberAdjustments ?? [])
    .filter((adjustment) => ownedFamilyMemberIdSet.has(adjustment.familyMemberId))
    .map((adjustment) => ({
      recipeIngredientId,
      familyMemberId: adjustment.familyMemberId,
      kind: adjustment.kind as RecipeIngredientAdjustmentKind,
      ingredientId:
        adjustment.kind === "MODIFY" ? adjustment.ingredientId ?? null : null,
      amount: adjustment.kind === "MODIFY" ? adjustment.amount ?? null : null,
      unitId: adjustment.kind === "MODIFY" ? adjustment.unitId ?? null : null,
      additionalInfo:
        adjustment.kind === "MODIFY" ? adjustment.additionalInfo ?? null : null,
    }));

  if (rows.length > 0) {
    await tx.recipeIngredientMemberAdjustment.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }
}
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
      memberAdjustments: {
        select: {
          familyMemberId: true,
          kind: true,
          ingredientId: true,
          amount: true,
          unitId: true,
          additionalInfo: true,
        },
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
              memberAdjustments: {
                select: {
                  familyMemberId: true,
                  kind: true,
                  ingredientId: true,
                  amount: true,
                  unitId: true,
                  additionalInfo: true,
                },
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
  audienceMembers: {
    select: { familyMemberId: true },
  },
  memberPortions: true,
} satisfies Prisma.RecipeInclude;

export async function getRecipeBySlug(
  userId: string,
  slug: string,
): Promise<RecipeType | null> {
  return await prisma.recipe.findFirst({
    where: { userId, slug },
    include: recipeInclude,
  });
}

export async function getRecipes(
  userId: string,
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
      userId,
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

async function getOwnedFamilyMembers(userId: string) {
  return prisma.familyMember.findMany({
    where: { userId },
    select: { id: true, isSelf: true },
    orderBy: { sortOrder: "asc" },
  });
}

function assertKnownFamilyMemberIds(
  familyMemberIds: string[],
  ownedFamilyMemberIds: Set<string>,
) {
  for (const id of familyMemberIds) {
    if (!ownedFamilyMemberIds.has(id)) {
      throw new Error("INVALID_FAMILY_MEMBER_SELECTION");
    }
  }
}

export async function createRecipe(
  userId: string,
  data: CreateRecipePayload & { slug: string },
) {
  const {
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
    ingredientGroups,
    ingredients,
    instructions,
    images,
    memberPortions,
    ...recipeData
  } = data;
  const categories = await validateAndBuildCategoryIds({
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
  });
  const ownedFamilyMembers = await getOwnedFamilyMembers(userId);
  const ownedFamilyMemberIds = new Set(ownedFamilyMembers.map((member) => member.id));
  const audienceFamilyMemberIds = ownedFamilyMembers.map((member) => member.id);
  assertKnownFamilyMemberIds(
    [
      ...memberPortions.map((portion) => portion.familyMemberId),
      ...ingredients.flatMap((ingredient) =>
        ingredient.memberAdjustments.map((adjustment) => adjustment.familyMemberId),
      ),
    ],
    ownedFamilyMemberIds,
  );
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
        userId,
        categories: {
          connect: categories.map((categoryId) => ({ id: categoryId })),
        },
        images: {
          create: images.map((img) => ({
            url: img.url,
            isCover: img.isCover,
          })),
        },
        audienceMembers: {
          create: audienceFamilyMemberIds.map((familyMemberId) => ({
            familyMemberId,
          })),
        },
      },
      select: { id: true },
    });

    const portionRows = memberPortions
      .filter((portion) => ownedFamilyMemberIds.has(portion.familyMemberId))
      .map((portion) => ({
        recipeId: recipe.id,
        familyMemberId: portion.familyMemberId,
        multiplier: portion.multiplier,
      }));
    if (portionRows.length > 0) {
      await tx.recipeMemberPortion.createMany({
        data: portionRows,
        skipDuplicates: true,
      });
    }

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
          appliesToEveryone: true,
          additionalInfo: ing.additionalInfo,
        },
        select: { id: true },
      });

      await syncMemberAdjustments(
        tx,
        created.id,
        ing.memberAdjustments,
        ownedFamilyMemberIds,
      );

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
  userId: string,
  recipeId: string,
  data: UpdateRecipePayload & { slug: string },
) {
  const {
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
    ingredientGroups,
    ingredients,
    instructions,
    images,
    memberPortions,
    ...recipeData
  } = data;
  const categories = await validateAndBuildCategoryIds({
    mealOccasionCategoryIds,
    proteinCategoryId,
    typeCategoryId,
  });
  const ownedFamilyMembers = await getOwnedFamilyMembers(userId);
  const ownedFamilyMemberIds = new Set(ownedFamilyMembers.map((member) => member.id));
  const audienceFamilyMemberIds = ownedFamilyMembers.map((member) => member.id);
  assertKnownFamilyMemberIds(
    [
      ...memberPortions.map((portion) => portion.familyMemberId),
      ...ingredients.flatMap((ingredient) =>
        ingredient.memberAdjustments.map((adjustment) => adjustment.familyMemberId),
      ),
    ],
    ownedFamilyMemberIds,
  );
  // Keep positions deterministic and unique even if client submits duplicates.
  const normalizedGroups = [...ingredientGroups]
    .sort((a, b) => a.position - b.position)
    .map((group, index) => ({
      ...group,
      position: index,
    }));

  return prisma.$transaction(async (tx) => {
    const owned = await tx.recipe.findFirst({
      where: { id: recipeId, userId },
      select: { id: true },
    });
    if (!owned) {
      throw new Error("RECIPE_NOT_FOUND");
    }

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

    await tx.recipeMemberPortion.deleteMany({
      where: { recipeId },
    });
    await tx.recipeAudienceMember.deleteMany({
      where: { recipeId },
    });
    if (audienceFamilyMemberIds.length > 0) {
      await tx.recipeAudienceMember.createMany({
        data: audienceFamilyMemberIds.map((familyMemberId) => ({
          recipeId,
          familyMemberId,
        })),
        skipDuplicates: true,
      });
    }
    const portionRows = memberPortions
      .filter((portion) => ownedFamilyMemberIds.has(portion.familyMemberId))
      .map((portion) => ({
        recipeId,
        familyMemberId: portion.familyMemberId,
        multiplier: portion.multiplier,
      }));
    if (portionRows.length > 0) {
      await tx.recipeMemberPortion.createMany({
        data: portionRows,
        skipDuplicates: true,
      });
    }

    await tx.recipeIngredientMemberAdjustment.deleteMany({
      where: { recipeIngredient: { recipeId } },
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
            appliesToEveryone: true,
            additionalInfo: ing.additionalInfo,
          },
        });
        ingredientIdByTempKey.set(ing.tempIngredientKey, ing.id);
        await syncMemberAdjustments(
          tx,
          ing.id,
          ing.memberAdjustments,
          ownedFamilyMemberIds,
        );
      } else {
        const created = await tx.recipeIngredient.create({
          data: {
            recipeId,
            groupId: nextGroupId,
            position: ing.position,
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unitId: ing.unitId,
            appliesToEveryone: true,
            additionalInfo: ing.additionalInfo,
          },
          select: { id: true },
        });
        await syncMemberAdjustments(
          tx,
          created.id,
          ing.memberAdjustments,
          ownedFamilyMemberIds,
        );
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

export async function deleteRecipe(userId: string, recipeId: string) {
  const owned = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("RECIPE_NOT_FOUND");
  }
  // Hard-delete recipe; related rows are removed by DB cascades.
  return prisma.recipe.delete({
    where: { id: recipeId },
    select: { id: true },
  });
}