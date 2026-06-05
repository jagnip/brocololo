import { describe, expect, it } from "vitest";
import {
  hasShoppingOverlayValues,
  resolveIngredientForUser,
} from "./resolve-for-user";

describe("resolveIngredientForUser", () => {
  const baseIngredient = {
    userId: null,
    supermarketUrl: "https://global.example/tomato",
    groceryIngredient: {
      additionalInfo: "ripe",
      substitutionsAllowed: true,
      substitutionNote: "cherry tomato",
    },
  };

  it("uses overlay values for global ingredients", () => {
    const resolved = resolveIngredientForUser(baseIngredient, {
      supermarketUrl: "https://mine.example/tomato",
      additionalInfo: "organic",
      substitutionNote: "roma tomato",
    });

    expect(resolved.supermarketUrl).toBe("https://mine.example/tomato");
    expect(resolved.groceryIngredient?.additionalInfo).toBe("organic");
    expect(resolved.groceryIngredient?.substitutionNote).toBe("roma tomato");
    expect(resolved.groceryIngredient?.substitutionsAllowed).toBe(true);
    expect(resolved.isGlobal).toBe(true);
    expect(resolved.hasUserCustomization).toBe(true);
  });

  it("ignores canonical global grocery fields when overlay is empty", () => {
    const resolved = resolveIngredientForUser(baseIngredient, {
      supermarketUrl: null,
      additionalInfo: null,
      substitutionNote: null,
    });

    expect(resolved.supermarketUrl).toBeNull();
    expect(resolved.groceryIngredient?.additionalInfo).toBeNull();
    expect(resolved.groceryIngredient?.substitutionNote).toBeNull();
    expect(resolved.hasUserCustomization).toBe(true);
  });

  it("returns empty grocery fields when no overlay exists", () => {
    const resolved = resolveIngredientForUser(baseIngredient, undefined);

    expect(resolved.supermarketUrl).toBeNull();
    expect(resolved.groceryIngredient?.additionalInfo).toBeNull();
    expect(resolved.groceryIngredient?.substitutionNote).toBeNull();
    expect(resolved.hasUserCustomization).toBe(false);
  });

  it("keeps canonical grocery fields for private ingredients", () => {
    const resolved = resolveIngredientForUser(
      { ...baseIngredient, userId: "user-1" },
      {
        supermarketUrl: "https://mine.example/tomato",
        additionalInfo: "organic",
        substitutionNote: "roma tomato",
      },
    );

    expect(resolved.supermarketUrl).toBe("https://global.example/tomato");
    expect(resolved.groceryIngredient?.additionalInfo).toBe("ripe");
    expect(resolved.isGlobal).toBe(false);
    expect(resolved.hasUserCustomization).toBe(false);
  });
});

describe("hasShoppingOverlayValues", () => {
  it("returns true when url, notes, or substitutions are set", () => {
    expect(
      hasShoppingOverlayValues({
        supermarketUrl: "https://example.com",
        additionalInfo: null,
        substitutionNote: null,
      }),
    ).toBe(true);

    expect(
      hasShoppingOverlayValues({
        supermarketUrl: null,
        additionalInfo: null,
        substitutionNote: "spinach",
      }),
    ).toBe(true);
  });

  it("returns false when all overlay fields are empty", () => {
    expect(
      hasShoppingOverlayValues({
        supermarketUrl: null,
        additionalInfo: null,
        substitutionNote: null,
      }),
    ).toBe(false);
  });
});
