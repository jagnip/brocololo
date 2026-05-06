"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import {
  generateShoppingListForPlan,
  saveShoppingLayoutPreset,
  setShoppingListActiveLayoutPreset,
  setShoppingListItemPurchased,
  updateShoppingListItems,
} from "@/lib/db/shopping-list";
import { saveShoppingListEditsSchema } from "@/lib/validations/shopping-list";

export async function generateGroceryListFromPlan(planId: string): Promise<
  | { type: "success"; shoppingListId: string }
  | { type: "error"; code: "plan_not_found" | "no_gram_unit"; message: string }
> {
  const result = await generateShoppingListForPlan(planId);
  if (!result.ok) {
    if (result.error === "plan_not_found") {
      return {
        type: "error",
        code: "plan_not_found",
        message: "Plan not found.",
      };
    }
    return {
      type: "error",
      code: "no_gram_unit",
      message: 'No unit with name "g" in database; cannot persist gram totals.',
    };
  }

  revalidatePath(ROUTES.groceries);
  revalidatePath(ROUTES.groceriesView(planId));
  revalidatePath(ROUTES.planView(planId));

  return { type: "success", shoppingListId: result.shoppingListId };
}

export async function setShoppingListItemPurchasedAction(input: {
  itemId: string;
  purchased: boolean;
}): Promise<
  | { type: "success"; itemId: string; purchased: boolean }
  | { type: "error"; message: string }
> {
  try {
    const updated = await setShoppingListItemPurchased(input);
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.shoppingList.planId));
    return {
      type: "success",
      itemId: updated.id,
      purchased: updated.purchased,
    };
  } catch {
    return {
      type: "error",
      message: "Could not update grocery item. Try again.",
    };
  }
}

export async function saveShoppingListEditsAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = saveShoppingListEditsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Please fix invalid grocery rows before saving.",
    };
  }

  try {
    // Three-bucket partition:
    //   - itemsToCreate: rows added in the form (isNew) that have a name.
    //   - itemsToUpdate: persisted rows that still have a name (regular edits).
    //   - itemIdsToDelete: persisted rows whose name was cleared (soft-delete).
    // Rows that are isNew + nameless are silently dropped (nothing to persist).
    const items = parsed.data.items;
    const hasName = (item: (typeof items)[number]) =>
      Boolean(item.ingredientId) || item.displayLabel.trim().length > 0;

    const itemsToCreate = items.filter(
      (item) => item.isNew && hasName(item),
    );
    const itemsToUpdate = items.filter(
      (item) => !item.isNew && hasName(item),
    );
    const itemIdsToDelete = items
      .filter((item) => !item.isNew && !hasName(item))
      .map((item) => item.id);

    await updateShoppingListItems({
      planId: parsed.data.planId,
      itemsToCreate,
      itemsToUpdate,
      itemIdsToDelete,
    });
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(parsed.data.planId));
    revalidatePath(ROUTES.groceriesEdit(parsed.data.planId));
    return { type: "success" };
  } catch {
    return {
      type: "error",
      message: "Could not save grocery edits. Try again.",
    };
  }
}

export async function setShoppingLayoutPresetAction(input: {
  planId: string;
  presetId: string;
}): Promise<{ type: "success" } | { type: "error"; message: string }> {
  try {
    const updated = await setShoppingListActiveLayoutPreset(input);
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.planId));
    revalidatePath(ROUTES.groceriesEdit(updated.planId));
    return { type: "success" };
  } catch {
    return {
      type: "error",
      message: "Could not switch grocery layout. Try again.",
    };
  }
}

export async function saveShoppingLayoutPresetAction(input: {
  planId: string;
  presetName: string;
  orderedCategoryIds: string[];
}): Promise<{ type: "success" } | { type: "error"; message: string }> {
  try {
    const updated = await saveShoppingLayoutPreset(input);
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.planId));
    revalidatePath(ROUTES.groceriesEdit(updated.planId));
    return { type: "success" };
  } catch (error) {
    if (error instanceof Error && error.message === "SHOPPING_LAYOUT_PRESET_NAME_REQUIRED") {
      return {
        type: "error",
        message: "Preset name cannot be empty.",
      };
    }
    return {
      type: "error",
      message: "Could not save grocery layout preset. Try again.",
    };
  }
}
