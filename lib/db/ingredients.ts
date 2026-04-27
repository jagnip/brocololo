import slugify from "slugify";
import { prisma } from "./index";
import type { IngredientPayload } from "@/lib/validations/ingredient";

export async function getIngredients() {
  return await prisma.ingredient.findMany({
    include: {
      unitConversions: {
        include: { unit: true },
        orderBy: { unit: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });
}

type GetIngredientsPageInput = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function getIngredientsPage({
  q,
  page = 1,
  pageSize = 25,
}: GetIngredientsPageInput) {
  // Normalize pagination inputs from query params.
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100
      ? pageSize
      : 25;

  // Apply case-insensitive search across name and brand when query is present.
  const trimmedQuery = q?.trim();
  const where = trimmedQuery
    ? {
        OR: [
          { name: { contains: trimmedQuery, mode: "insensitive" as const } },
          { descriptor: { contains: trimmedQuery, mode: "insensitive" as const } },
          { brand: { contains: trimmedQuery, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [total, items] = await Promise.all([
    prisma.ingredient.count({ where }),
    prisma.ingredient.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true, sortOrder: true },
        },
        unitConversions: {
          include: { unit: { select: { id: true, name: true } } },
          orderBy: { unit: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

export async function getIngredientBySlug(slug: string) {
  return prisma.ingredient.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true, sortOrder: true },
      },
      unitConversions: {
        include: {
          unit: {
            select: { id: true, name: true },
          },
        },
        orderBy: { unit: { name: "asc" } },
      },
    },
  });
}

export async function getIngredientCategories() {
  return prisma.ingredientCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function getGramsUnit() {
  return prisma.unit.findUnique({
    where: { name: "g" },
    select: { id: true, name: true },
  });
}

export async function findIngredientIdentityDuplicate(input: {
  name: string;
  descriptor: string | null;
  brand: string | null;
  excludeIngredientId?: string;
}) {
  return prisma.ingredient.findFirst({
    where: {
      name: { equals: input.name, mode: "insensitive" },
      descriptor:
        input.descriptor == null
          ? null
          : { equals: input.descriptor, mode: "insensitive" },
      brand:
        input.brand == null
          ? null
          : { equals: input.brand, mode: "insensitive" },
      ...(input.excludeIngredientId ? { id: { not: input.excludeIngredientId } } : {}),
    },
    select: { id: true },
  });
}

export async function createIngredient(
  data: IngredientPayload & { slug: string },
) {
  const { unitConversions, ...ingredientData } = data;

  return prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.create({
      data: ingredientData,
      select: { id: true, slug: true },
    });

    await tx.ingredientUnit.createMany({
      data: unitConversions.map((conversion) => ({
        ingredientId: ingredient.id,
        unitId: conversion.unitId,
        gramsPerUnit: conversion.gramsPerUnit,
      })),
    });

    return tx.ingredient.findUniqueOrThrow({
      where: { id: ingredient.id },
      include: {
        unitConversions: {
          include: { unit: true },
        },
      },
    });
  });
}

export type RemovedConversionUsage = {
  unitName: string;
  recipes: Array<{ name: string; slug: string }>;
};

export type IngredientDeleteUsage = {
  recipeName: string;
  recipeSlug: string;
};

export type RemovedConversionFallbackStats = {
  updatedRows: number;
  updatedRecipes: number;
};

export async function getRemovedConversionUsages(
  ingredientId: string,
  incomingUnitIds: string[],
): Promise<RemovedConversionUsage[]> {
  const existingConversions = await prisma.ingredientUnit.findMany({
    where: { ingredientId },
    select: {
      unitId: true,
      unit: { select: { name: true } },
    },
  });

  const removedUnitIds = existingConversions
    .map((row) => row.unitId)
    .filter((unitId) => !incomingUnitIds.includes(unitId));

  if (removedUnitIds.length === 0) {
    return [];
  }

  const blockingRows = await prisma.recipeIngredient.findMany({
    where: {
      ingredientId,
      unitId: { in: removedUnitIds },
    },
    select: {
      unit: { select: { name: true } },
      recipe: { select: { name: true, slug: true } },
    },
  });

  const groupedByUnit = new Map<string, RemovedConversionUsage>();

  for (const row of blockingRows) {
    if (!row.unit) {
      continue;
    }
    const key = row.unit.name;
    const current =
      groupedByUnit.get(key) ?? {
        unitName: row.unit.name,
        recipes: [],
      };

    if (!current.recipes.some((recipe) => recipe.slug === row.recipe.slug)) {
      current.recipes.push(row.recipe);
    }

    groupedByUnit.set(key, current);
  }

  return [...groupedByUnit.values()];
}

export async function getIngredientDeleteUsages(
  ingredientId: string,
): Promise<IngredientDeleteUsage[]> {
  const rows = await prisma.recipeIngredient.findMany({
    where: { ingredientId },
    select: {
      recipe: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  // Dedupe recipe rows in case the same ingredient appears multiple times per recipe.
  const uniqueByRecipeSlug = new Map<string, IngredientDeleteUsage>();

  for (const row of rows) {
    if (!uniqueByRecipeSlug.has(row.recipe.slug)) {
      uniqueByRecipeSlug.set(row.recipe.slug, {
        recipeName: row.recipe.name,
        recipeSlug: row.recipe.slug,
      });
    }
  }

  return [...uniqueByRecipeSlug.values()].sort((a, b) =>
    a.recipeName.localeCompare(b.recipeName),
  );
}

export async function updateIngredient(
  ingredientId: string,
  data: IngredientPayload & { slug: string },
  options: { gramsUnitId: string },
) {
  const { unitConversions, ...ingredientData } = data;

  return prisma.$transaction(async (tx) => {
    const existingConversions = await tx.ingredientUnit.findMany({
      where: { ingredientId },
      select: {
        unitId: true,
        gramsPerUnit: true,
      },
    });
    const incomingUnitIds = new Set(unitConversions.map((conversion) => conversion.unitId));
    const removedConversions = existingConversions.filter(
      (conversion) => !incomingUnitIds.has(conversion.unitId),
    );
    const removedUnitIds = removedConversions.map((conversion) => conversion.unitId);
    const fallbackStats: RemovedConversionFallbackStats = {
      updatedRows: 0,
      updatedRecipes: 0,
    };

    if (removedUnitIds.length > 0) {
      const affectedRecipeIngredients = await tx.recipeIngredient.findMany({
        where: {
          ingredientId,
          unitId: { in: removedUnitIds },
        },
        select: {
          id: true,
          recipeId: true,
          unitId: true,
          amount: true,
        },
      });
      if (affectedRecipeIngredients.length > 0) {
        const gramsPerRemovedUnitId = new Map(
          removedConversions.map((conversion) => [
            conversion.unitId,
            conversion.gramsPerUnit,
          ]),
        );
        // Convert persisted row amounts to grams before replacing removed units.
        await Promise.all(
          affectedRecipeIngredients.map((row) => {
            const gramsPerUnit =
              row.unitId == null ? undefined : gramsPerRemovedUnitId.get(row.unitId);
            const nextAmount =
              row.amount != null && gramsPerUnit != null
                ? row.amount * gramsPerUnit
                : row.amount;
            return tx.recipeIngredient.update({
              where: { id: row.id },
              data: {
                unitId: options.gramsUnitId,
                amount: nextAmount,
              },
            });
          }),
        );
        fallbackStats.updatedRows = affectedRecipeIngredients.length;
        fallbackStats.updatedRecipes = new Set(
          affectedRecipeIngredients.map((row) => row.recipeId),
        ).size;
      }
    }

    await tx.ingredient.update({
      where: { id: ingredientId },
      data: ingredientData,
    });

    // Replace-all conversion model keeps edit logic straightforward.
    await tx.ingredientUnit.deleteMany({
      where: { ingredientId },
    });

    await tx.ingredientUnit.createMany({
      data: unitConversions.map((conversion) => ({
        ingredientId,
        unitId: conversion.unitId,
        gramsPerUnit: conversion.gramsPerUnit,
      })),
    });

    const ingredient = await tx.ingredient.findUniqueOrThrow({
      where: { id: ingredientId },
      include: {
        unitConversions: {
          include: { unit: true },
        },
      },
    });
    return { ingredient, fallbackStats };
  });
}

type IngredientSlugIdentity = {
  name: string;
  descriptor: string | null;
  brand: string | null;
};

/**
 * Generates a unique slug from an ingredient identity, appending a random suffix
 * if the readable base slug is already taken by another ingredient.
 */
export async function findAvailableSlug(
  identity: IngredientSlugIdentity,
  excludeIngredientId?: string,
): Promise<string> {
  const slugSource = [identity.name, identity.descriptor, identity.brand]
    .filter(Boolean)
    .join(" ");
  const baseSlug = slugify(slugSource, { lower: true, strict: true, trim: true });

  const collision = await prisma.ingredient.findFirst({
    where: {
      slug: baseSlug,
      ...(excludeIngredientId ? { id: { not: excludeIngredientId } } : {}),
    },
    select: { id: true },
  });

  if (!collision) {
    return baseSlug;
  }

  // Append random suffix to resolve collision.
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${baseSlug}-${suffix}`;
}

export async function deleteIngredient(ingredientId: string) {
  return prisma.ingredient.delete({
    where: { id: ingredientId },
    select: { id: true },
  });
}
