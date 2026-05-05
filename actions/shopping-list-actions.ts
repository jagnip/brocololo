"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import {
  generateShoppingListForPlan,
  setShoppingListItemPurchased,
} from "@/lib/db/shopping-list";

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
