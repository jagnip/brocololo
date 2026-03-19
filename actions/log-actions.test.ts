import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  replaceMealSlotWithRecipe,
  updateLogRecipeIngredients,
  upsertLogSlot,
} from "@/lib/db/logs";
import {
  addRecipeToLogAction,
  updateLogRecipeIngredientsAction,
  upsertLogSlotAction,
} from "./log-actions";

vi.mock("@/lib/db/logs", () => ({
  updateLogRecipeIngredients: vi.fn(),
  replaceMealSlotWithRecipe: vi.fn(),
  upsertLogSlot: vi.fn(),
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

describe("addRecipeToLogAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid input", async () => {
    const result = await addRecipeToLogAction({
      recipeId: "",
      person: "PRIMARY",
      date: "invalid-date",
      mealType: "DINNER",
      ingredients: [],
    } as never);

    expect(result.type).toBe("error");
    expect(replaceMealSlotWithRecipe).not.toHaveBeenCalled();
  });

  it("adds recipe to log and returns success", async () => {
    vi.mocked(replaceMealSlotWithRecipe).mockResolvedValue({
      logId: "log-1",
    });

    const result = await addRecipeToLogAction({
      recipeId: "recipe-1",
      person: "PRIMARY",
      date: "2026-03-19",
      mealType: "DINNER",
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    } as never);

    expect(result).toEqual({ type: "success" });
    expect(replaceMealSlotWithRecipe).toHaveBeenCalledWith({
      recipeId: "recipe-1",
      person: "PRIMARY",
      date: new Date("2026-03-19"),
      mealType: "DINNER",
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    });
  });
});

describe("upsertLogSlotAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid input", async () => {
    const result = await upsertLogSlotAction({
      logId: "",
      person: "PRIMARY",
      entryId: "entry-1",
      recipeId: null,
      ingredients: [],
    } as never);

    expect(result.type).toBe("error");
    expect(upsertLogSlot).not.toHaveBeenCalled();
  });

  it("upserts custom slot with recipeId null", async () => {
    vi.mocked(upsertLogSlot).mockResolvedValue(undefined);

    const result = await upsertLogSlotAction({
      logId: "log-1",
      person: "PRIMARY",
      entryId: "entry-1",
      recipeId: null,
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    });

    expect(result).toEqual({ type: "success" });
    expect(upsertLogSlot).toHaveBeenCalledWith({
      logId: "log-1",
      person: "PRIMARY",
      entryId: "entry-1",
      recipeId: null,
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    });
  });
});
