import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateLogRecipeIngredients } from "@/lib/db/logs";
import { updateLogRecipeIngredientsAction } from "./log-actions";

vi.mock("@/lib/db/logs", () => ({
  updateLogRecipeIngredients: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateLogRecipeIngredientsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid input", async () => {
    const result = await updateLogRecipeIngredientsAction({
      logId: "",
      person: "PRIMARY",
      entryId: "entry-1",
      entryRecipeId: "entry-recipe-1",
      ingredients: [],
    } as never);

    expect(result.type).toBe("error");
    expect(updateLogRecipeIngredients).not.toHaveBeenCalled();
  });

  it("updates recipe ingredients and returns success", async () => {
    vi.mocked(updateLogRecipeIngredients).mockResolvedValue(undefined);

    const result = await updateLogRecipeIngredientsAction({
      logId: "log-1",
      person: "PRIMARY",
      entryId: "entry-1",
      entryRecipeId: "entry-recipe-1",
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    });

    expect(result).toEqual({ type: "success" });
    expect(updateLogRecipeIngredients).toHaveBeenCalledWith({
      logId: "log-1",
      person: "PRIMARY",
      entryId: "entry-1",
      entryRecipeId: "entry-recipe-1",
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    });
  });
});
