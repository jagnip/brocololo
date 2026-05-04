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
