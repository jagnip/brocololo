import { describe, expect, it } from "vitest";
import { applyUserGroceryOverridesToListItems } from "@/lib/groceries/apply-user-grocery-overrides-to-list";

describe("applyUserGroceryOverridesToListItems", () => {
  const baseItem = {
    id: "item-1",
    additionalInfo: "List-specific note",
    substitutionsAllowed: true,
    substitutionNote: "List substitution",
    groceryIngredient: {
      ingredient: {
        id: "global-ing-1",
        userId: null,
        supermarketUrl: null,
      },
    },
  };

  it("preserves list-item additionalInfo and substitutionNote for global ingredients", () => {
    const customizationMap = new Map([
      [
        "global-ing-1",
        {
          supermarketUrl: "https://shop.example/tomato",
          additionalInfo: "Overlay note",
          substitutionNote: "Overlay substitution",
        },
      ],
    ]);

    const [result] = applyUserGroceryOverridesToListItems([baseItem], customizationMap);

    expect(result.additionalInfo).toBe("List-specific note");
    expect(result.substitutionNote).toBe("List substitution");
    expect(result.substitutionsAllowed).toBe(true);
    expect(result.groceryIngredient?.ingredient.supermarketUrl).toBe(
      "https://shop.example/tomato",
    );
  });

  it("leaves private-ingredient rows unchanged", () => {
    const privateItem = {
      ...baseItem,
      groceryIngredient: {
        ingredient: {
          id: "private-ing-1",
          userId: "user-1",
          supermarketUrl: "https://shop.example/private",
        },
      },
    };

    const customizationMap = new Map([
      [
        "private-ing-1",
        {
          supermarketUrl: "https://shop.example/overlay",
          additionalInfo: "Overlay",
          substitutionNote: null,
        },
      ],
    ]);

    const [result] = applyUserGroceryOverridesToListItems([privateItem], customizationMap);

    expect(result).toEqual(privateItem);
  });
});
