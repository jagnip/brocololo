import { describe, expect, it } from "vitest";
import {
  appendRedirectToastToPath,
  getRedirectToastMessage,
  isRedirectToastCode,
  MESSAGES,
  REDIRECT_TOAST_QUERY_PARAM,
} from "./messages";

describe("redirect toast helpers", () => {
  it("accepts known redirect toast codes", () => {
    expect(isRedirectToastCode("recipeCreated")).toBe(true);
    expect(isRedirectToastCode("recipeUpdated")).toBe(true);
    expect(isRedirectToastCode("ingredientCreated")).toBe(true);
    expect(isRedirectToastCode("ingredientUpdated")).toBe(true);
  });

  it("rejects unknown redirect toast codes", () => {
    expect(isRedirectToastCode("unknownToast")).toBe(false);
  });

  it("returns redirect toast message for known code", () => {
    expect(getRedirectToastMessage("recipeCreated")).toBe(MESSAGES.recipe.created);
    expect(getRedirectToastMessage("ingredientUpdated")).toBe(
      MESSAGES.ingredient.updated,
    );
  });

  it("returns null for unknown code", () => {
    expect(getRedirectToastMessage("not-a-code")).toBeNull();
  });

  it("appends query param to path without existing query", () => {
    const path = appendRedirectToastToPath("/ingredients", "ingredientCreated");
    expect(path).toBe(
      `/ingredients?${REDIRECT_TOAST_QUERY_PARAM}=ingredientCreated`,
    );
  });

  it("appends query param to path with existing query", () => {
    const path = appendRedirectToastToPath(
      "/recipes/soup?category=savoury",
      "recipeUpdated",
    );
    expect(path).toBe(
      `/recipes/soup?category=savoury&${REDIRECT_TOAST_QUERY_PARAM}=recipeUpdated`,
    );
  });
});
