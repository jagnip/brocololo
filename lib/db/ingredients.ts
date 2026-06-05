import slugify from "slugify";
import { prisma } from "./index";
import type {
  IngredientPayload,
  IngredientShoppingOverlayPayload,
} from "@/lib/validations/ingredient";
import { deriveSubstitutionsAllowed } from "@/lib/groceries/substitutions";
import {
  hasShoppingOverlayValues,
  resolveIngredientForUser,
  type IngredientWithGroceryFields,
  type ResolvedIngredientForUser,
} from "@/lib/ingredients/resolve-for-user";
import { ingredientVisibilityWhere } from "./ingredient-visibility";

const ingredientListInclude = {
  category: {
    select: { id: true, name: true, slug: true, sortOrder: true },
  },
  unitConversions: {
    include: { unit: true },
    orderBy: { unit: { name: "asc" as const } },
  },
  groceryIngredient: true,
} as const;

export async function getIngredientCustomizationMap(
  userId: string,
  ingredientIds: string[],
) {
  if (ingredientIds.length === 0) {
    return new Map<
      string,
      {
        supermarketUrl: string | null;
        additionalInfo: string | null;
        substitutionNote: string | null;
      }
    >();
  }

  const rows = await prisma.ingredientUserCustomization.findMany({
    where: {
      userId,
      ingredientId: { in: ingredientIds },
    },
    select: {
      ingredientId: true,
      supermarketUrl: true,
      additionalInfo: true,
      substitutionNote: true,
    },
  });

  return new Map(
    rows.map((row) => [
      row.ingredientId,
      {
        supermarketUrl: row.supermarketUrl,
        additionalInfo: row.additionalInfo,
        substitutionNote: row.substitutionNote,
      },
    ]),
  );
}

function mergeIngredientsForUser<
  T extends { id: string; userId: string | null } & IngredientWithGroceryFields,
>(
  userId: string,
  ingredients: T[],
  customizationMap: Awaited<ReturnType<typeof getIngredientCustomizationMap>>,
): ResolvedIngredientForUser<T>[] {
  return ingredients.map((ingredient) =>
    resolveIngredientForUser(
      ingredient,
      ingredient.userId === null ? customizationMap.get(ingredient.id) : null,
    ),
  );
}

export async function getIngredientById(ingredientId: string) {
  return prisma.ingredient.findUnique({
    where: { id: ingredientId },
    select: {
      id: true,
      userId: true,
      slug: true,
    },
  });
}

export async function getIngredients(userId: string) {
  const ingredients = await prisma.ingredient.findMany({
    where: ingredientVisibilityWhere(userId),
    include: ingredientListInclude,
    orderBy: { name: "asc" },
  });

  const customizationMap = await getIngredientCustomizationMap(
    userId,
    ingredients.filter((row) => row.userId === null).map((row) => row.id),
  );

  return mergeIngredientsForUser(userId, ingredients, customizationMap);
}

type GetIngredientsPageInput = {
  userId: string;
  q?: string;
  categorySlug?: string;
  page?: number;
  pageSize?: number;
};

export async function getIngredientsPage({
  userId,
  q,
  categorySlug,
  page = 1,
  pageSize = 25,
}: GetIngredientsPageInput) {
  // Normalize pagination inputs from query params.
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100
      ? pageSize
      : 25;

  // Treat empty / whitespace-only filter slugs as "no filter" so URL noise doesn't break queries.
  const trimmedCategorySlug = categorySlug?.trim();
  const trimmedQuery = q?.trim();

  // Combine search and category filters with AND so both narrow the result set together.
  const searchClause = trimmedQuery
    ? {
        OR: [
          { name: { contains: trimmedQuery, mode: "insensitive" as const } },
          { descriptor: { contains: trimmedQuery, mode: "insensitive" as const } },
          { brand: { contains: trimmedQuery, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const categoryClause = trimmedCategorySlug
    ? { category: { slug: trimmedCategorySlug } }
    : undefined;

  // Build the final where only with the clauses we actually have, so an empty filter stays unset.
  const visibility = ingredientVisibilityWhere(userId);
  const where =
    searchClause || categoryClause
      ? { AND: [visibility, { ...(searchClause ?? {}), ...(categoryClause ?? {}) }] }
      : visibility;

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
        groceryIngredient: true,
      },
      orderBy: { name: "asc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
  ]);

  const customizationMap = await getIngredientCustomizationMap(
    userId,
    items.filter((row) => row.userId === null).map((row) => row.id),
  );

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    items: mergeIngredientsForUser(userId, items, customizationMap),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

export type IngredientsPageData = Awaited<ReturnType<typeof getIngredientsPage>>;
export type IngredientsPageItem = IngredientsPageData["items"][number];

export async function getIngredientBySlug(userId: string, slug: string) {
  const ingredient = await prisma.ingredient.findFirst({
    where: {
      slug,
      OR: [{ userId: null }, { userId }],
    },
    include: {
      category: {
        select: { id: true, name: true, slug: true, sortOrder: true },
      },
      unitConversions: {
        include: { unit: true },
        orderBy: { unit: { name: "asc" } },
      },
      groceryIngredient: true,
    },
  });

  if (!ingredient) {
    return null;
  }

  const customization =
    ingredient.userId === null
      ? await prisma.ingredientUserCustomization.findUnique({
          where: {
            userId_ingredientId: { userId, ingredientId: ingredient.id },
          },
          select: {
            supermarketUrl: true,
            additionalInfo: true,
            substitutionNote: true,
          },
        })
      : null;

  return resolveIngredientForUser(ingredient, customization);
}

export async function getIngredientCategories() {
  return prisma.ingredientCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

// Tiny accessor so the action layer doesn't need to make inline prisma calls just to get a slug.
export async function getIngredientCategorySlugById(categoryId: string) {
  const row = await prisma.ingredientCategory.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  });
  return row?.slug ?? null;
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
  categoryId: string;
  /** null = global catalog row; set for private ingredient owner scope */
  ownerUserId: string | null;
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
      categoryId: input.categoryId,
      userId: input.ownerUserId,
      ...(input.excludeIngredientId ? { id: { not: input.excludeIngredientId } } : {}),
    },
    select: { id: true },
  });
}

export async function createIngredient(
  ownerUserId: string | null,
  data: IngredientPayload & { slug: string },
) {
  const {
    unitConversions,
    groceryAdditionalInfo,
    grocerySubstitutionNote,
    visibility: _visibility,
    ...ingredientData
  } = data;
  const isGlobal = ownerUserId === null;
  const substitutionsAllowed = isGlobal
    ? false
    : deriveSubstitutionsAllowed(grocerySubstitutionNote);

  return prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.create({
      data: {
        ...ingredientData,
        // Global catalog rows never store personal grocery URLs.
        supermarketUrl: isGlobal ? null : ingredientData.supermarketUrl,
        userId: ownerUserId,
      },
      select: { id: true, slug: true },
    });

    await tx.ingredientUnit.createMany({
      data: unitConversions.map((conversion) => ({
        ingredientId: ingredient.id,
        unitId: conversion.unitId,
        gramsPerUnit: conversion.gramsPerUnit,
      })),
    });

    // Global ingredients keep an empty grocery shell for shopping-list FKs.
    await tx.groceryIngredient.upsert({
      where: { ingredientId: ingredient.id },
      create: {
        ingredientId: ingredient.id,
        additionalInfo: isGlobal ? null : groceryAdditionalInfo,
        substitutionNote: isGlobal ? null : grocerySubstitutionNote,
        substitutionsAllowed,
      },
      update: {
        additionalInfo: isGlobal ? null : groceryAdditionalInfo,
        substitutionNote: isGlobal ? null : grocerySubstitutionNote,
        substitutionsAllowed,
      },
    });

    return tx.ingredient.findUniqueOrThrow({
      where: { id: ingredient.id },
      include: {
        category: {
          select: { id: true, name: true, slug: true, sortOrder: true },
        },
        unitConversions: {
          include: { unit: true },
        },
        groceryIngredient: true,
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
  const {
    unitConversions,
    groceryAdditionalInfo,
    grocerySubstitutionNote,
    visibility: _visibility,
    ...ingredientData
  } = data;
  return prisma.$transaction(async (tx) => {
    const existingIngredient = await tx.ingredient.findUnique({
      where: { id: ingredientId },
      select: { userId: true },
    });
    const isGlobal = existingIngredient?.userId === null;
    const substitutionsAllowed = isGlobal
      ? false
      : deriveSubstitutionsAllowed(grocerySubstitutionNote);

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
      data: {
        ...ingredientData,
        supermarketUrl: isGlobal ? null : ingredientData.supermarketUrl,
      },
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

    await tx.groceryIngredient.upsert({
      where: { ingredientId },
      create: {
        ingredientId,
        additionalInfo: isGlobal ? null : groceryAdditionalInfo,
        substitutionNote: isGlobal ? null : grocerySubstitutionNote,
        substitutionsAllowed,
      },
      update: {
        additionalInfo: isGlobal ? null : groceryAdditionalInfo,
        substitutionNote: isGlobal ? null : grocerySubstitutionNote,
        substitutionsAllowed,
      },
    });

    const ingredient = await tx.ingredient.findUniqueOrThrow({
      where: { id: ingredientId },
      include: {
        category: {
          select: { id: true, name: true, slug: true, sortOrder: true },
        },
        unitConversions: {
          include: { unit: true },
        },
        groceryIngredient: true,
      },
    });
    return { ingredient, fallbackStats };
  });
}

type IngredientSlugIdentity = {
  name: string;
  descriptor: string | null;
  brand: string | null;
  // Joined into the slug source so the same name+descriptor+brand in different categories yields distinct, meaningful slugs.
  categorySlug: string | null;
};

/**
 * Generates a unique slug from an ingredient identity, appending a random suffix
 * if the readable base slug is already taken by another ingredient.
 */
export async function findAvailableSlug(
  identity: IngredientSlugIdentity,
  options: {
    ownerUserId: string | null;
    excludeIngredientId?: string;
  },
): Promise<string> {
  const slugSource = [
    identity.name,
    identity.descriptor,
    identity.brand,
    identity.categorySlug,
  ]
    .filter(Boolean)
    .join(" ");
  const baseSlug = slugify(slugSource, { lower: true, strict: true, trim: true });

  const collision = await prisma.ingredient.findFirst({
    where: {
      slug: baseSlug,
      userId: options.ownerUserId,
      ...(options.excludeIngredientId
        ? { id: { not: options.excludeIngredientId } }
        : {}),
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

export async function upsertIngredientUserCustomization(
  userId: string,
  ingredientId: string,
  data: IngredientShoppingOverlayPayload,
) {
  const base = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    select: { slug: true, userId: true },
  });

  if (!base || base.userId !== null) {
    return null;
  }

  const overlayRow = {
    supermarketUrl: data.supermarketUrl,
    additionalInfo: data.groceryAdditionalInfo,
    substitutionNote: data.grocerySubstitutionNote,
  };

  if (!hasShoppingOverlayValues(overlayRow)) {
    await prisma.ingredientUserCustomization.deleteMany({
      where: { userId, ingredientId },
    });
  } else {
    await prisma.ingredientUserCustomization.upsert({
      where: {
        userId_ingredientId: { userId, ingredientId },
      },
      create: {
        userId,
        ingredientId,
        supermarketUrl: data.supermarketUrl,
        additionalInfo: data.groceryAdditionalInfo,
        substitutionNote: data.grocerySubstitutionNote,
      },
      update: {
        supermarketUrl: data.supermarketUrl,
        additionalInfo: data.groceryAdditionalInfo,
        substitutionNote: data.grocerySubstitutionNote,
      },
    });
  }

  return getIngredientBySlug(userId, base.slug);
}

export async function deleteIngredient(ingredientId: string) {
  return prisma.ingredient.delete({
    where: { id: ingredientId },
    select: { id: true },
  });
}
