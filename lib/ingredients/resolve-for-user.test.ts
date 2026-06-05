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

  it("merges user shopping overlay over global defaults", () => {
    const resolved = resolveIngredientForUser(baseIngredient, {
      supermarketUrl: "https://mine.example/tomato",
      additionalInfo: "organic",
    });

    expect(resolved.supermarketUrl).toBe("https://mine.example/tomato");
    expect(resolved.groceryIngredient?.additionalInfo).toBe("organic");
    expect(resolved.groceryIngredient?.substitutionNote).toBe("cherry tomato");
    expect(resolved.isGlobal).toBe(true);
    expect(resolved.hasUserCustomization).toBe(true);
  });

  it("falls back to global values when overlay fields are null", () => {
    const resolved = resolveIngredientForUser(baseIngredient, {
      supermarketUrl: null,
      additionalInfo: null,
    });

    expect(resolved.supermarketUrl).toBe("https://global.example/tomato");
    expect(resolved.groceryIngredient?.additionalInfo).toBe("ripe");
    expect(resolved.hasUserCustomization).toBe(true);
  });

  it("marks private ingredients as not global", () => {
    const resolved = resolveIngredientForUser(
      { ...baseIngredient, userId: "user-1" },
      null,
    );

    expect(resolved.isGlobal).toBe(false);
    expect(resolved.hasUserCustomization).toBe(false);
  });
});

describe("hasShoppingOverlayValues", () => {
  it("returns true when url or notes are set", () => {
    expect(
      hasShoppingOverlayValues({
        supermarketUrl: "https://example.com",
        additionalInfo: null,
      }),
    ).toBe(true);
  });

  it("returns false when both fields are empty", () => {
    expect(
      hasShoppingOverlayValues({
        supermarketUrl: null,
        additionalInfo: null,
      }),
    ).toBe(false);
  });
});
