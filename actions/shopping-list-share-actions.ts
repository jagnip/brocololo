"use server";

import { revalidatePath } from "next/cache";
import { getAppOrigin } from "@/lib/app-origin";
import { requireUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";
import {
  createPublicShareForPlan,
  getActiveShareForPlan,
  resolvePublicShare,
  revokeActiveShareForPlan,
} from "@/lib/db/shopping-list-share";
import {
  setShoppingListActiveLayoutPresetForList,
  setShoppingListItemPurchasedForList,
} from "@/lib/db/shopping-list";

export async function getActiveShoppingListShareAction(planId: string): Promise<
  | { type: "success"; url: string; expiresAt: string }
  | { type: "none" }
  | { type: "error"; message: string }
> {
  const { id: userId } = await requireUser();
  const share = await getActiveShareForPlan(userId, planId);
  if (!share) {
    return { type: "none" };
  }

  const origin = await getAppOrigin();
  return {
    type: "success",
    url: `${origin}${ROUTES.shareGroceries(share.token)}`,
    expiresAt: share.expiresAt.toISOString(),
  };
}

export async function createShoppingListShareAction(planId: string): Promise<
  | { type: "success"; url: string; expiresAt: string }
  | { type: "error"; message: string }
> {
  const { id: userId } = await requireUser();
  const result = await createPublicShareForPlan(userId, planId);

  if (!result.ok) {
    if (result.error === "plan_not_found") {
      return { type: "error", message: "Plan not found." };
    }
    return {
      type: "error",
      message: "Generate a grocery list with at least one item before sharing.",
    };
  }

  const origin = await getAppOrigin();
  revalidatePath(ROUTES.groceriesView(planId));

  return {
    type: "success",
    url: `${origin}${ROUTES.shareGroceries(result.token)}`,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function revokeShoppingListShareAction(planId: string): Promise<
  | { type: "success" }
  | { type: "error"; message: string }
> {
  const { id: userId } = await requireUser();
  const revoked = await revokeActiveShareForPlan(userId, planId);
  if (!revoked) {
    return { type: "error", message: "No active share link to revoke." };
  }

  revalidatePath(ROUTES.groceriesView(planId));
  return { type: "success" };
}

export async function setShoppingListItemPurchasedByShareAction(input: {
  token: string;
  itemId: string;
  purchased: boolean;
}): Promise<
  | { type: "success" }
  | { type: "error"; message: string }
> {
  const share = await resolvePublicShare(input.token);
  if (!share) {
    return {
      type: "error",
      message: "This link is invalid or has expired.",
    };
  }

  try {
    await setShoppingListItemPurchasedForList({
      shoppingListId: share.shoppingListId,
      itemId: input.itemId,
      purchased: input.purchased,
    });
    return { type: "success" };
  } catch {
    return { type: "error", message: "Could not update this item." };
  }
}

export async function setShoppingLayoutPresetByShareAction(input: {
  token: string;
  presetId: string;
}): Promise<
  | { type: "success" }
  | { type: "error"; message: string }
> {
  const share = await resolvePublicShare(input.token);
  if (!share) {
    return {
      type: "error",
      message: "This link is invalid or has expired.",
    };
  }

  try {
    await setShoppingListActiveLayoutPresetForList({
      shoppingListId: share.shoppingListId,
      presetId: input.presetId,
    });
    return { type: "success" };
  } catch {
    return { type: "error", message: "Could not change supermarket layout." };
  }
}
