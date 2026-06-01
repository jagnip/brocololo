import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createShoppingListShareAction,
  setShoppingListItemPurchasedByShareAction,
} from "./shopping-list-share-actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "user-1", clerkId: "clerk-1" }),
}));

vi.mock("@/lib/app-origin", () => ({
  getAppOrigin: vi.fn().mockResolvedValue("https://app.example.com"),
}));

vi.mock("@/lib/db/shopping-list-share", () => ({
  createPublicShareForPlan: vi.fn(),
  getActiveShareForPlan: vi.fn(),
  resolvePublicShare: vi.fn(),
  revokeActiveShareForPlan: vi.fn(),
}));

vi.mock("@/lib/db/shopping-list", () => ({
  setShoppingListItemPurchasedForList: vi.fn(),
  setShoppingListActiveLayoutPresetForList: vi.fn(),
}));

import { createPublicShareForPlan, resolvePublicShare } from "@/lib/db/shopping-list-share";
import { setShoppingListItemPurchasedForList } from "@/lib/db/shopping-list";

describe("createShoppingListShareAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns share url when create succeeds", async () => {
    vi.mocked(createPublicShareForPlan).mockResolvedValue({
      ok: true,
      token: "abc123",
      expiresAt: new Date("2026-06-10T12:00:00.000Z"),
      shareId: "share-1",
    });

    const result = await createShoppingListShareAction("plan-1");
    expect(result).toEqual({
      type: "success",
      url: "https://app.example.com/share/groceries/abc123",
      expiresAt: "2026-06-10T12:00:00.000Z",
    });
  });

  it("returns error when list is empty", async () => {
    vi.mocked(createPublicShareForPlan).mockResolvedValue({
      ok: false,
      error: "list_empty",
    });

    const result = await createShoppingListShareAction("plan-1");
    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.message).toContain("at least one item");
    }
  });
});

describe("setShoppingListItemPurchasedByShareAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid token", async () => {
    vi.mocked(resolvePublicShare).mockResolvedValue(null);

    const result = await setShoppingListItemPurchasedByShareAction({
      token: "bad",
      itemId: "item-1",
      purchased: true,
    });

    expect(result).toEqual({
      type: "error",
      message: "This link is invalid or has expired.",
    });
    expect(setShoppingListItemPurchasedForList).not.toHaveBeenCalled();
  });

  it("updates item when token is valid", async () => {
    vi.mocked(resolvePublicShare).mockResolvedValue({
      shareId: "share-1",
      shoppingListId: "list-1",
      planId: "plan-1",
      planStartDate: new Date(),
      planEndDate: new Date(),
    });
    vi.mocked(setShoppingListItemPurchasedForList).mockResolvedValue({
      id: "item-1",
      purchased: true,
      shoppingList: { planId: "plan-1" },
    } as never);

    const result = await setShoppingListItemPurchasedByShareAction({
      token: "good",
      itemId: "item-1",
      purchased: true,
    });

    expect(result).toEqual({ type: "success" });
    expect(setShoppingListItemPurchasedForList).toHaveBeenCalledWith({
      shoppingListId: "list-1",
      itemId: "item-1",
      purchased: true,
    });
  });
});
