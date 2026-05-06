import type { Prisma } from "@/src/generated/client";
import { getPlanForGroceries } from "@/lib/db/planner";
import { transformPlanToShoppingListRows } from "@/lib/groceries/helpers";
import type { PlanSlotData } from "@/lib/groceries/helpers";
import { prisma } from "@/lib/db/index";

let cachedGramUnitId: string | null | undefined;

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

  await tx.shoppingLayoutPresetCategory.deleteMany({
    where: { presetId: preset.id },
  });

  if (categories.length > 0) {
    await tx.shoppingLayoutPresetCategory.createMany({
      data: categories.map((c, position) => ({
        presetId: preset.id,
        ingredientCategoryId: c.id,
        position,
      })),
    });
  }

  return preset.id;
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
          update: { activeLayoutPresetId: presetId },
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
        update: { activeLayoutPresetId: presetId },
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
  const list = await prisma.shoppingList.findUnique({
    where: { planId },
    include: {
      plan: { select: { id: true, startDate: true, endDate: true } },
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
  });

  if (!list) return null;

  list.items.sort((a, b) => {
    if (a.category.sortOrder !== b.category.sortOrder) {
      return a.category.sortOrder - b.category.sortOrder;
    }
    if (a.position !== b.position) return a.position - b.position;
    return a.displayLabel.localeCompare(b.displayLabel);
  });

  return list;
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
  items: Array<{
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

      const updateIds = [...new Set(input.items.map((row) => row.id))];
      const deleteIds = [...new Set(input.itemIdsToDelete)];
      // Validate update + delete IDs against this list in one round-trip so
      // callers can't sneak rows from another list into either bucket.
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

      const ingredientIds = [
        ...new Set(
          input.items
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

      for (const row of input.items) {
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
