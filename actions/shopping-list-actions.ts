"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import {
  deleteActiveShoppingLayoutPreset,
  deleteShoppingLayoutPreset,
  deleteShoppingListForPlan,
  generateShoppingListForPlan,
  getGroceryGenerationMealOptionsForPlan,
  renameShoppingLayoutPreset,
  saveShoppingLayoutPreset,
  setShoppingListActiveLayoutPreset,
  setShoppingListItemPurchased,
  updateShoppingLayoutPreset,
  updateShoppingListItems,
} from "@/lib/db/shopping-list";
import {
  deleteActiveShoppingLayoutPresetSchema,
  deleteShoppingListSchema,
  groceryGenerationExclusionsSchema,
  renameShoppingLayoutPresetSchema,
  saveShoppingListEditsSchema,
  updateShoppingLayoutPresetSchema,
} from "@/lib/validations/shopping-list";
import type { GroceryMealOption } from "@/lib/groceries/generation-options";

export async function getGroceryGenerationMealOptions(planId: string): Promise<
  | { type: "success"; meals: GroceryMealOption[] }
  | { type: "error"; code: "plan_not_found"; message: string }
> {
  const { id: userId } = await requireUser();
  const meals = await getGroceryGenerationMealOptionsForPlan(userId, planId);
  if (!meals) {
    return {
      type: "error",
      code: "plan_not_found",
      message: "Plan not found.",
    };
  }
  return { type: "success", meals };
}

export async function generateGroceryListFromPlan(
  planId: string,
  exclusionsInput: unknown,
): Promise<
  | { type: "success"; shoppingListId: string }
  | { type: "error"; code: "plan_not_found" | "no_gram_unit" | "invalid_exclusions"; message: string }
> {
  const parsed = groceryGenerationExclusionsSchema.safeParse(exclusionsInput);
  if (!parsed.success) {
    return {
      type: "error",
      code: "invalid_exclusions",
      message: "Invalid meal selection. Try again.",
    };
  }

  const { id: userId } = await requireUser();
  const result = await generateShoppingListForPlan(userId, planId, parsed.data);
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
    const { id: userId } = await requireUser();
    const updated = await setShoppingListItemPurchased({ userId, ...input });
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
    const { id: userId } = await requireUser();
    const items = parsed.data.items;
    const hasName = (item: (typeof items)[number]) =>
      Boolean(item.ingredientId) || item.displayLabel.trim().length > 0;

    const itemsToCreate = items.filter(
      (item) => item.isNew && hasName(item),
    );
    const itemsToUpdate = items.filter(
      (item) => !item.isNew && hasName(item),
    );
    const clearedNameIds = items
      .filter((item) => !item.isNew && !hasName(item))
      .map((item) => item.id);
    const itemIdsToDelete = [
      ...new Set([...parsed.data.deletedItemIds, ...clearedNameIds]),
    ];

    await updateShoppingListItems({
      userId,
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
    const { id: userId } = await requireUser();
    const updated = await setShoppingListActiveLayoutPreset({ userId, ...input });
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
}): Promise<
  { type: "success"; presetId: string } | { type: "error"; message: string }
> {
  try {
    const { id: userId } = await requireUser();
    const updated = await saveShoppingLayoutPreset({ userId, ...input });
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.planId));
    revalidatePath(ROUTES.groceriesEdit(updated.planId));
    return { type: "success", presetId: updated.presetId };
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

export async function updateShoppingLayoutPresetAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = updateShoppingLayoutPresetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not save grocery layout. Invalid request payload.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const updated = await updateShoppingLayoutPreset({ userId, ...parsed.data });
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.planId));
    revalidatePath(ROUTES.groceriesEdit(updated.planId));
    return { type: "success" };
  } catch (error) {
    if (error instanceof Error && error.message === "SHOPPING_LAYOUT_PRESET_BUILT_IN") {
      return {
        type: "error",
        message: "Default layout cannot be edited. Save as a new layout instead.",
      };
    }
    return {
      type: "error",
      message: "Could not save grocery layout. Try again.",
    };
  }
}

export async function renameShoppingLayoutPresetAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = renameShoppingLayoutPresetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not rename grocery layout. Invalid request payload.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const updated = await renameShoppingLayoutPreset({ userId, ...parsed.data });
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.planId));
    revalidatePath(ROUTES.groceriesEdit(updated.planId));
    return { type: "success" };
  } catch (error) {
    if (error instanceof Error && error.message === "SHOPPING_LAYOUT_PRESET_BUILT_IN") {
      return {
        type: "error",
        message: "Default layout cannot be renamed.",
      };
    }
    if (error instanceof Error && error.message === "SHOPPING_LAYOUT_PRESET_NAME_TAKEN") {
      return {
        type: "error",
        message: "A layout with this name already exists.",
      };
    }
    if (error instanceof Error && error.message === "SHOPPING_LAYOUT_PRESET_NAME_REQUIRED") {
      return {
        type: "error",
        message: "Layout name cannot be empty.",
      };
    }
    return {
      type: "error",
      message: "Could not rename grocery layout. Try again.",
    };
  }
}

export async function deleteShoppingListAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = deleteShoppingListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not delete grocery list. Invalid request payload.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const deleted = await deleteShoppingListForPlan({ userId, ...parsed.data });
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(deleted.planId));
    revalidatePath(ROUTES.planView(deleted.planId));
    return { type: "success" };
  } catch (error) {
    if (error instanceof Error && error.message === "SHOPPING_LIST_NOT_FOUND") {
      return {
        type: "error",
        message: "No grocery list to delete.",
      };
    }
    return {
      type: "error",
      message: "Could not delete grocery list. Try again.",
    };
  }
}

export async function deleteActiveShoppingLayoutPresetAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = deleteActiveShoppingLayoutPresetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not remove grocery layout. Invalid request payload.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const updated = await deleteActiveShoppingLayoutPreset({ userId, ...parsed.data });
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.planId));
    revalidatePath(ROUTES.groceriesEdit(updated.planId));
    return { type: "success" };
  } catch (error) {
    if (error instanceof Error && error.message === "SHOPPING_LAYOUT_PRESET_BUILT_IN") {
      return {
        type: "error",
        message: "Default layout cannot be removed.",
      };
    }
    return {
      type: "error",
      message: "Could not remove grocery layout. Try again.",
    };
  }
}

export async function deleteShoppingLayoutPresetAction(input: unknown): Promise<
  | { type: "success"; wasActive: boolean; deletedPresetName: string }
  | { type: "error"; message: string }
> {
  const parsed = deleteActiveShoppingLayoutPresetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not remove grocery layout. Invalid request payload.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const updated = await deleteShoppingLayoutPreset({ userId, ...parsed.data });
    revalidatePath(ROUTES.groceries);
    revalidatePath(ROUTES.groceriesView(updated.planId));
    revalidatePath(ROUTES.groceriesEdit(updated.planId));
    return {
      type: "success",
      wasActive: updated.wasActive,
      deletedPresetName: updated.deletedPresetName,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "SHOPPING_LAYOUT_PRESET_BUILT_IN") {
      return {
        type: "error",
        message: "Default layout cannot be removed.",
      };
    }
    return {
      type: "error",
      message: "Could not remove grocery layout. Try again.",
    };
  }
}
