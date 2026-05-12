import type { Prisma } from "@/src/generated/client";
import { getPlanForGroceries } from "@/lib/db/planner";
import { transformPlanToShoppingListRows } from "@/lib/groceries/helpers";
import type { PlanSlotData } from "@/lib/groceries/helpers";
import { prisma } from "@/lib/db/index";

let cachedGramUnitId: string | null | undefined;
const TRANSIENT_DB_MAX_ATTEMPTS = 3;
const TRANSIENT_DB_RETRY_DELAYS_MS = [150, 400];
const TRANSIENT_COMPUTE_NODE_PATTERNS = [
  "couldn't connect to compute node",
  "could not connect to compute node",
  "connection reset",
  "timeout",
];

function isTransientComputeNodeError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return TRANSIENT_COMPUTE_NODE_PATTERNS.some((pattern) =>
    message.includes(pattern),
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientDbRetry<T>(
  run: () => Promise<T>,
  context: string,
): Promise<T> {
  for (let attempt = 1; attempt <= TRANSIENT_DB_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const canRetry =
        isTransientComputeNodeError(error) &&
        attempt < TRANSIENT_DB_MAX_ATTEMPTS;
      if (!canRetry) throw error;
      // Compute nodes can be cold briefly; small backoff avoids surfacing a
      // user-facing crash for transient wake-up/connect failures.
      await delay(TRANSIENT_DB_RETRY_DELAYS_MS[attempt - 1] ?? 500);
      console.warn(
        `[db retry] ${context}: transient error on attempt ${attempt}, retrying.`,
      );
    }
  }
  throw new Error("UNREACHABLE_RETRY_EXIT");
}

type CategoryOrderSource = {
  ingredientCategoryId: string;
  position: number;
};

function buildCategoryOrderIds(input: {
  categoryIdsByDefaultOrder: string[];
  categoryOrders: CategoryOrderSource[];
}) {
  const knownCategoryIds = new Set(input.categoryIdsByDefaultOrder);
  const orderedFromPreset = [...input.categoryOrders]
    .sort((a, b) => a.position - b.position)
    .map((row) => row.ingredientCategoryId)
    .filter((categoryId, index, all) => all.indexOf(categoryId) === index)
    .filter((categoryId) => knownCategoryIds.has(categoryId));
  const missingByDefaultOrder = input.categoryIdsByDefaultOrder.filter(
    (categoryId) => !orderedFromPreset.includes(categoryId),
  );
  return [...orderedFromPreset, ...missingByDefaultOrder];
}

/** Resolves the canonical gram unit id for aggregated grocery rows (unitName "g", unitId null). */
export async function getGramUnitId(): Promise<string | null> {
  if (cachedGramUnitId !== undefined) return cachedGramUnitId;
  const row = await prisma.unit.findUnique({
    where: { name: "g" },
    select: { id: true },
  });
  cachedGramUnitId = row?.id ?? null;
  return cachedGramUnitId;
}

/**
 * Ensures built-in "Default" layout preset exists and its category order matches all IngredientCategory rows.
 */
export async function ensureDefaultShoppingLayoutPreset(
  tx: Prisma.TransactionClient,
): Promise<string> {
  let preset = await tx.shoppingLayoutPreset.findFirst({
    where: { name: "Default", isBuiltIn: true },
  });
  if (!preset) {
    preset = await tx.shoppingLayoutPreset.create({
      data: { name: "Default", isBuiltIn: true },
    });
  }

  const categories = await tx.ingredientCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  const existingRows = await tx.shoppingLayoutPresetCategory.findMany({
    where: { presetId: preset.id },
    select: { ingredientCategoryId: true },
  });
  const existingCategoryIds = new Set(existingRows.map((row) => row.ingredientCategoryId));
  const missingCategories = categories.filter((category) => !existingCategoryIds.has(category.id));
  if (missingCategories.length > 0) {
    const nextBasePosition = existingRows.length;
    await tx.shoppingLayoutPresetCategory.createMany({
      data: missingCategories.map((category, index) => ({
        presetId: preset.id,
        ingredientCategoryId: category.id,
        position: nextBasePosition + index,
      })),
      skipDuplicates: true,
    });
  }

  return preset.id;
}

/**
 * Rebuilds every shopping layout preset’s aisle list so it includes all current
 * `IngredientCategory` rows (default `sortOrder`, preserving prior order where
 * categories still exist). Run after bulk category changes in production.
 */
export async function rebuildAllShoppingLayoutPresetCategoryOrders(
  tx: Prisma.TransactionClient,
) {
  const categories = await tx.ingredientCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (categories.length === 0) return;

  const presets = await tx.shoppingLayoutPreset.findMany({
    include: {
      categoryOrders: {
        select: { ingredientCategoryId: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });

  for (const preset of presets) {
    const mergedCategoryOrder = buildCategoryOrderIds({
      categoryIdsByDefaultOrder: categories.map((category) => category.id),
      categoryOrders: preset.categoryOrders,
    });
    await tx.shoppingLayoutPresetCategory.deleteMany({
      where: { presetId: preset.id },
    });
    await tx.shoppingLayoutPresetCategory.createMany({
      data: mergedCategoryOrder.map((ingredientCategoryId, position) => ({
        presetId: preset.id,
        ingredientCategoryId,
        position,
      })),
    });
  }
}

/** Batch-ensures GroceryIngredient rows exist (one round-trip per phase; avoids N sequential queries in a tx). */
async function ensureGroceryIngredientsForIngredientIds(
  tx: Prisma.TransactionClient,
  ingredientIds: string[],
): Promise<
  Array<{
    id: string;
    ingredientId: string;
    additionalInfo: string | null;
    substitutionsAllowed: boolean;
    substitutionNote: string | null;
  }>
> {
  if (ingredientIds.length === 0) return [];

  let rows = await tx.groceryIngredient.findMany({
    where: { ingredientId: { in: ingredientIds } },
  });
  const have = new Set(rows.map((r) => r.ingredientId));
  const missing = ingredientIds.filter((id) => !have.has(id));
  if (missing.length > 0) {
    await tx.groceryIngredient.createMany({
      data: missing.map((ingredientId) => ({
        ingredientId,
        substitutionsAllowed: false,
      })),
      skipDuplicates: true,
    });
    rows = await tx.groceryIngredient.findMany({
      where: { ingredientId: { in: ingredientIds } },
    });
  }
  return rows;
}

function slotsToPlanSlotData(
  slots: NonNullable<Awaited<ReturnType<typeof getPlanForGroceries>>>["slots"],
): PlanSlotData[] {
  return slots.map((s) => ({
    recipe: s.recipe as PlanSlotData["recipe"],
  }));
}

/**
 * Replaces shopping list items for the plan from current planner slots (full plan date range).
 */
export async function generateShoppingListForPlan(planId: string): Promise<
  | { ok: true; shoppingListId: string }
  | { ok: false; error: "plan_not_found" | "no_gram_unit" }
> {
  const plan = await getPlanForGroceries(planId);
  if (!plan) return { ok: false, error: "plan_not_found" };

  const gramUnitId = await getGramUnitId();
  if (!gramUnitId) return { ok: false, error: "no_gram_unit" };

  const rows = transformPlanToShoppingListRows(slotsToPlanSlotData(plan.slots));
  if (rows.length === 0) {
    const emptyListId = await prisma.$transaction(
      async (tx) => {
        const presetId = await ensureDefaultShoppingLayoutPreset(tx);
        const list = await tx.shoppingList.upsert({
          where: { planId },
          create: { planId, activeLayoutPresetId: presetId },
          // Preserve the user's chosen active preset for this list.
          update: {},
        });
        await tx.shoppingListItem.deleteMany({ where: { shoppingListId: list.id } });
        return list.id;
      },
      { timeout: 15_000 },
    );
    return { ok: true, shoppingListId: emptyListId };
  }

  const distinctIngredientIds = [...new Set(rows.map((r) => r.ingredientId))];

  const shoppingListId = await prisma.$transaction(
    async (tx) => {
      const presetId = await ensureDefaultShoppingLayoutPreset(tx);
      await rebuildAllShoppingLayoutPresetCategoryOrders(tx);

      const profiles = await ensureGroceryIngredientsForIngredientIds(
        tx,
        distinctIngredientIds,
      );
      const groceryByIngredient = new Map(
        profiles.map((p) => [p.ingredientId, p.id] as const),
      );
      const profileByIngredientId = new Map(
        profiles.map((p) => [p.ingredientId, p] as const),
      );

      const list = await tx.shoppingList.upsert({
        where: { planId },
        create: { planId, activeLayoutPresetId: presetId },
        // Preserve previously selected layout on regeneration.
        update: {},
      });

      await tx.shoppingListItem.deleteMany({ where: { shoppingListId: list.id } });

      const categoryIds = [...new Set(rows.map((r) => r.ingredientCategoryId))];
      const categorySort = new Map(
        rows.map((r) => [r.ingredientCategoryId, r.categorySortOrder] as const),
      );
      categoryIds.sort(
        (a, b) => (categorySort.get(a) ?? 0) - (categorySort.get(b) ?? 0),
      );

      const createPayload: Prisma.ShoppingListItemCreateManyInput[] = [];

      for (const categoryId of categoryIds) {
        const inCat = rows
          .filter((r) => r.ingredientCategoryId === categoryId)
          .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

        inCat.forEach((line, position) => {
          const groceryIngredientId = groceryByIngredient.get(line.ingredientId)!;
          const resolvedUnitId =
            line.unitId ??
            (line.unitName === "g" && line.amount !== null ? gramUnitId : null);
          const profile = profileByIngredientId.get(line.ingredientId);

          createPayload.push({
            shoppingListId: list.id,
            groceryIngredientId,
            ingredientCategoryId: line.ingredientCategoryId,
            displayLabel: line.ingredientName,
            unitId: resolvedUnitId,
            amount: line.amount,
            additionalInfo: profile?.additionalInfo ?? null,
            substitutionsAllowed: profile?.substitutionsAllowed ?? false,
            substitutionNote: profile?.substitutionNote ?? null,
            purchased: false,
            recipeAttribution:
              line.recipeNames.length > 0 ? line.recipeNames.join(", ") : null,
            position,
          });
        });
      }

      await tx.shoppingListItem.createMany({ data: createPayload });

      return list.id;
    },
    { timeout: 15_000 },
  );

  return { ok: true, shoppingListId: shoppingListId };
}

/** Shopping list with items for groceries UI (sorted by category then position). */
export async function getShoppingListByPlanId(planId: string) {
  const allCategories = await withTransientDbRetry(
    () =>
      prisma.ingredientCategory.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      }),
    "getShoppingListByPlanId:ingredientCategory.findMany",
  );
  const list = await withTransientDbRetry(
    () =>
      prisma.shoppingList.findUnique({
        where: { planId },
        include: {
          plan: { select: { id: true, startDate: true, endDate: true } },
          activeLayoutPreset: {
            include: {
              categoryOrders: {
                select: { ingredientCategoryId: true, position: true },
                orderBy: { position: "asc" },
              },
            },
          },
          items: {
            include: {
              category: true,
              unit: true,
              groceryIngredient: {
                include: {
                  ingredient: {
                    select: {
                      id: true,
                      icon: true,
                      supermarketUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    "getShoppingListByPlanId:shoppingList.findUnique",
  );

  if (!list) return null;

  const layoutPresets = await withTransientDbRetry(
    () =>
      prisma.shoppingLayoutPreset.findMany({
        orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
        include: {
          categoryOrders: {
            select: { ingredientCategoryId: true, position: true },
            orderBy: { position: "asc" },
          },
        },
      }),
    "getShoppingListByPlanId:shoppingLayoutPreset.findMany",
  );
  const categoryIdsByDefaultOrder = allCategories.map((category) => category.id);
  const effectiveCategoryOrderIds = buildCategoryOrderIds({
    categoryIdsByDefaultOrder,
    categoryOrders: list.activeLayoutPreset?.categoryOrders ?? [],
  });
  const categoryOrderRank = new Map(
    effectiveCategoryOrderIds.map((categoryId, index) => [categoryId, index] as const),
  );

  list.items.sort((a, b) => {
    const leftOrder = categoryOrderRank.get(a.ingredientCategoryId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = categoryOrderRank.get(b.ingredientCategoryId) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    if (a.position !== b.position) return a.position - b.position;
    return a.displayLabel.localeCompare(b.displayLabel);
  });

  return {
    ...list,
    effectiveCategoryOrderIds,
    layoutPresets: layoutPresets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      isBuiltIn: preset.isBuiltIn,
      categoryOrderIds: buildCategoryOrderIds({
        categoryIdsByDefaultOrder,
        categoryOrders: preset.categoryOrders,
      }),
    })),
  };
}

export async function setShoppingListActiveLayoutPreset(input: {
  planId: string;
  presetId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const list = await tx.shoppingList.findUnique({
      where: { planId: input.planId },
      select: { id: true, planId: true },
    });
    if (!list) throw new Error("SHOPPING_LIST_NOT_FOUND");

    const preset = await tx.shoppingLayoutPreset.findUnique({
      where: { id: input.presetId },
      select: { id: true },
    });
    if (!preset) throw new Error("SHOPPING_LAYOUT_PRESET_NOT_FOUND");

    await tx.shoppingList.update({
      where: { id: list.id },
      data: { activeLayoutPresetId: preset.id },
    });

    return { planId: list.planId, presetId: preset.id };
  });
}

export async function deleteActiveShoppingLayoutPreset(input: {
  planId: string;
  presetId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const list = await tx.shoppingList.findUnique({
      where: { planId: input.planId },
      select: { id: true, planId: true, activeLayoutPresetId: true },
    });
    if (!list) throw new Error("SHOPPING_LIST_NOT_FOUND");

    if (!list.activeLayoutPresetId || list.activeLayoutPresetId !== input.presetId) {
      throw new Error("SHOPPING_LAYOUT_PRESET_NOT_ACTIVE");
    }

    const preset = await tx.shoppingLayoutPreset.findUnique({
      where: { id: input.presetId },
      select: { id: true, isBuiltIn: true },
    });
    if (!preset) throw new Error("SHOPPING_LAYOUT_PRESET_NOT_FOUND");
    if (preset.isBuiltIn) throw new Error("SHOPPING_LAYOUT_PRESET_BUILT_IN");

    // Always transition the list back to the built-in layout before deleting.
    const defaultPresetId = await ensureDefaultShoppingLayoutPreset(tx);
    await tx.shoppingList.update({
      where: { id: list.id },
      data: { activeLayoutPresetId: defaultPresetId },
    });

    await tx.shoppingLayoutPreset.delete({
      where: { id: preset.id },
    });

    return {
      planId: list.planId,
      deletedPresetId: preset.id,
      activePresetId: defaultPresetId,
    };
  });
}

export async function saveShoppingLayoutPreset(input: {
  planId: string;
  presetName: string;
  orderedCategoryIds: string[];
}) {
  const trimmedPresetName = input.presetName.trim();
  if (!trimmedPresetName) throw new Error("SHOPPING_LAYOUT_PRESET_NAME_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const list = await tx.shoppingList.findUnique({
      where: { planId: input.planId },
      select: { id: true, planId: true },
    });
    if (!list) throw new Error("SHOPPING_LIST_NOT_FOUND");

    const allCategories = await tx.ingredientCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    const normalizedCategoryOrder = buildCategoryOrderIds({
      categoryIdsByDefaultOrder: allCategories.map((category) => category.id),
      categoryOrders: input.orderedCategoryIds.map((ingredientCategoryId, position) => ({
        ingredientCategoryId,
        position,
      })),
    });

    const preset =
      (await tx.shoppingLayoutPreset.findFirst({
        where: { name: trimmedPresetName },
        select: { id: true, isBuiltIn: true },
      })) ??
      (await tx.shoppingLayoutPreset.create({
        data: { name: trimmedPresetName, isBuiltIn: false },
        select: { id: true, isBuiltIn: true },
      }));

    await tx.shoppingLayoutPresetCategory.deleteMany({
      where: { presetId: preset.id },
    });
    await tx.shoppingLayoutPresetCategory.createMany({
      data: normalizedCategoryOrder.map((ingredientCategoryId, position) => ({
        presetId: preset.id,
        ingredientCategoryId,
        position,
      })),
    });

    await tx.shoppingList.update({
      where: { id: list.id },
      data: { activeLayoutPresetId: preset.id },
    });

    return { planId: list.planId, presetId: preset.id };
  });
}

/** True when a persisted shopping list row exists for the plan (regenerating replaces its lines). */
export async function planHasShoppingList(planId: string): Promise<boolean> {
  const row = await prisma.shoppingList.findUnique({
    where: { planId },
    select: { id: true },
  });
  return row != null;
}

/** Updates one shopping-list item purchased flag and returns parent plan id for revalidation. */
export async function setShoppingListItemPurchased(input: {
  itemId: string;
  purchased: boolean;
}) {
  return prisma.shoppingListItem.update({
    where: { id: input.itemId },
    data: { purchased: input.purchased },
    select: {
      id: true,
      purchased: true,
      shoppingList: {
        select: {
          planId: true,
        },
      },
    },
  });
}

export async function updateShoppingListItems(input: {
  planId: string;
  // Rows added in the form. They have no DB id yet (the temp client id is not
  // sent through here); the server assigns a real id and a per-category position.
  itemsToCreate: Array<{
    ingredientId: string | null;
    ingredientCategoryId: string;
    displayLabel: string;
    unitId: string | null;
    amount: number | null;
    additionalInfo: string | null;
    substitutionsAllowed: boolean;
    substitutionNote: string | null;
  }>;
  // Existing rows being edited. Each id must already belong to this list.
  itemsToUpdate: Array<{
    id: string;
    ingredientId: string | null;
    ingredientCategoryId: string;
    displayLabel: string;
    unitId: string | null;
    amount: number | null;
    additionalInfo: string | null;
    substitutionsAllowed: boolean;
    substitutionNote: string | null;
  }>;
  // IDs of rows whose name was cleared on the client; these rows are removed
  // from the persisted list as part of this transaction.
  itemIdsToDelete: string[];
}) {
  return prisma.$transaction(
    async (tx) => {
      const list = await tx.shoppingList.findUnique({
        where: { planId: input.planId },
        select: { id: true, planId: true },
      });
      if (!list) {
        throw new Error("SHOPPING_LIST_NOT_FOUND");
      }

      const updateIds = [...new Set(input.itemsToUpdate.map((row) => row.id))];
      const deleteIds = [...new Set(input.itemIdsToDelete)];
      // Validate update + delete IDs against this list in one round-trip so
      // callers can't sneak rows from another list into either bucket. New
      // rows are not in the guard because they have no DB id yet.
      const allIds = [...new Set([...updateIds, ...deleteIds])];
      const existingRows = await tx.shoppingListItem.findMany({
        where: { shoppingListId: list.id, id: { in: allIds } },
        select: { id: true, ingredientCategoryId: true },
      });
      if (existingRows.length !== allIds.length) {
        // Guard against accidentally updating/deleting rows from another list.
        throw new Error("INVALID_ITEM_SELECTION");
      }

      if (deleteIds.length > 0) {
        await tx.shoppingListItem.deleteMany({
          where: { shoppingListId: list.id, id: { in: deleteIds } },
        });
      }

      // Resolve grocery / category lookups across BOTH buckets in one round-trip
      // so create and update share the same maps.
      const ingredientIds = [
        ...new Set(
          [...input.itemsToCreate, ...input.itemsToUpdate]
            .map((row) => row.ingredientId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const groceryProfiles = await ensureGroceryIngredientsForIngredientIds(
        tx,
        ingredientIds,
      );
      const groceryIdByIngredientId = new Map(
        groceryProfiles.map((profile) => [profile.ingredientId, profile.id] as const),
      );

      const ingredients = await tx.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: { id: true, categoryId: true },
      });
      const categoryIdByIngredientId = new Map(
        ingredients.map((ingredient) => [ingredient.id, ingredient.categoryId] as const),
      );

      // Resolve final category id for a row: when an ingredient is selected
      // we trust the ingredient's home category over whatever the client sent,
      // matching the existing update path.
      const resolveCategoryId = (row: {
        ingredientId: string | null;
        ingredientCategoryId: string;
      }): string => {
        if (!row.ingredientId) return row.ingredientCategoryId;
        const fromIngredient = categoryIdByIngredientId.get(row.ingredientId);
        if (!fromIngredient) {
          throw new Error("INGREDIENT_NOT_FOUND");
        }
        return fromIngredient;
      };

      // Compute next position per affected category for new rows. Doing this
      // before any creates lets us batch-insert in one createMany call.
      if (input.itemsToCreate.length > 0) {
        const newCategoryIds = [
          ...new Set(input.itemsToCreate.map((row) => resolveCategoryId(row))),
        ];
        const maxPositions = await tx.shoppingListItem.groupBy({
          by: ["ingredientCategoryId"],
          where: {
            shoppingListId: list.id,
            ingredientCategoryId: { in: newCategoryIds },
          },
          _max: { position: true },
        });
        const nextPositionByCategory = new Map(
          newCategoryIds.map((categoryId) => {
            const found = maxPositions.find(
              (entry) => entry.ingredientCategoryId === categoryId,
            );
            return [categoryId, (found?._max.position ?? -1) + 1] as const;
          }),
        );

        const createPayload: Prisma.ShoppingListItemCreateManyInput[] =
          input.itemsToCreate.map((row) => {
            if (
              row.ingredientId &&
              !groceryIdByIngredientId.has(row.ingredientId)
            ) {
              throw new Error("INGREDIENT_NOT_FOUND");
            }
            const ingredientCategoryId = resolveCategoryId(row);
            const position = nextPositionByCategory.get(ingredientCategoryId) ?? 0;
            // Bump the running counter so multiple new rows in the same
            // category land at distinct positions.
            nextPositionByCategory.set(ingredientCategoryId, position + 1);

            return {
              shoppingListId: list.id,
              groceryIngredientId: row.ingredientId
                ? (groceryIdByIngredientId.get(row.ingredientId) as string)
                : null,
              ingredientCategoryId,
              displayLabel: row.displayLabel,
              unitId: row.unitId,
              amount: row.amount,
              additionalInfo: row.additionalInfo,
              substitutionsAllowed: row.substitutionsAllowed,
              substitutionNote: row.substitutionNote,
              purchased: false,
              // User-added rows have no recipe attribution.
              recipeAttribution: null,
              position,
            };
          });

        await tx.shoppingListItem.createMany({ data: createPayload });
      }

      for (const row of input.itemsToUpdate) {
        const existingRow = existingRows.find((candidate) => candidate.id === row.id);
        if (!existingRow) throw new Error("INVALID_ITEM_SELECTION");
        if (
          row.ingredientId &&
          (!groceryIdByIngredientId.has(row.ingredientId) ||
            !categoryIdByIngredientId.has(row.ingredientId))
        ) {
          throw new Error("INGREDIENT_NOT_FOUND");
        }

        await tx.shoppingListItem.update({
          where: { id: row.id },
          data: {
            groceryIngredientId: row.ingredientId
              ? (groceryIdByIngredientId.get(row.ingredientId) as string)
              : null,
            ingredientCategoryId: row.ingredientId
              ? (categoryIdByIngredientId.get(row.ingredientId) as string)
              : row.ingredientCategoryId,
            displayLabel: row.displayLabel,
            unitId: row.unitId,
            amount: row.amount,
            additionalInfo: row.additionalInfo,
            substitutionsAllowed: row.substitutionsAllowed,
            substitutionNote: row.substitutionNote,
          },
        });
      }

      return { planId: list.planId };
    },
    { timeout: 15_000 },
  );
}
