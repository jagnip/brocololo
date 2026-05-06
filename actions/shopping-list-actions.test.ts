import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import { saveShoppingListEditsAction } from "@/actions/shopping-list-actions";
import { updateShoppingListItems } from "@/lib/db/shopping-list";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db/shopping-list", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/db/shopping-list")>(
      "@/lib/db/shopping-list",
    );
  return {
    ...actual,
    updateShoppingListItems: vi.fn(),
    generateShoppingListForPlan: vi.fn(),
    setShoppingListItemPurchased: vi.fn(),
  };
});

function makeValidInput() {
  return {
    planId: "plan-1",
    items: [
      {
        id: "item-1",
        ingredientId: "ingredient-1",
        displayLabel: "Tomato",
        unitId: "unit-g",
        amount: 120,
        additionalInfo: null,
        substitutionsAllowed: false,
        substitutionNote: null,
      },
    ],
  };
}

describe("saveShoppingListEditsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid payload", async () => {
    const result = await saveShoppingListEditsAction({
      planId: "",
      items: [],
    });

    expect(result).toEqual({
      type: "error",
      message: "Please fix invalid grocery rows before saving.",
    });
    expect(updateShoppingListItems).not.toHaveBeenCalled();
  });

  it("saves rows and revalidates affected routes", async () => {
    vi.mocked(updateShoppingListItems).mockResolvedValue({ planId: "plan-1" });

    const result = await saveShoppingListEditsAction(makeValidInput());

    expect(result).toEqual({ type: "success" });
    expect(updateShoppingListItems).toHaveBeenCalledWith(makeValidInput());
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.groceries);
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.groceriesView("plan-1"));
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.groceriesEdit("plan-1"));
  });

  it("returns generic save error when update fails", async () => {
    vi.mocked(updateShoppingListItems).mockRejectedValue(new Error("boom"));

    const result = await saveShoppingListEditsAction(makeValidInput());

    expect(result).toEqual({
      type: "error",
      message: "Could not save grocery edits. Try again.",
    });
  });
});
