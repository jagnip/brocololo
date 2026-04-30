import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendNextLogDay,
  clearLogEntryAssignment,
  deleteLogById,
  getLogs,
  placePlannerPoolItemInEntry,
  removeLogDay,
  replaceMealSlotWithRecipe,
  updateLogRecipeIngredients,
  upsertLogSlot,
} from "@/lib/db/logs";
import {
  addRecipeToLogAction,
  appendNextLogDayAction,
  clearLogEntryAssignmentAction,
  deleteLogAction,
  placePlannerPoolItemAction,
  removeLogDayAction,
  updateLogRecipeIngredientsAction,
  upsertLogSlotAction,
} from "./log-actions";

vi.mock("@/lib/db/logs", () => ({
  updateLogRecipeIngredients: vi.fn(),
  replaceMealSlotWithRecipe: vi.fn(),
  upsertLogSlot: vi.fn(),
  placePlannerPoolItemInEntry: vi.fn(),
  clearLogEntryAssignment: vi.fn(),
  appendNextLogDay: vi.fn(),
  removeLogDay: vi.fn(),
  deleteLogById: vi.fn(),
  getLogs: vi.fn(),
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

  it("maps LOG_DATE_NOT_GENERATED to a clear user-facing error", async () => {
    // Explicit domain error helps callers distinguish invalid date selection from generic failures.
    vi.mocked(replaceMealSlotWithRecipe).mockRejectedValue(
      new Error("LOG_DATE_NOT_GENERATED"),
    );

    const result = await addRecipeToLogAction({
      recipeId: "recipe-1",
      person: "PRIMARY",
      date: "2026-03-19",
      mealType: "DINNER",
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    } as never);

    expect(result).toEqual({
      type: "error",
      message: "Selected date is outside generated logs.",
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

describe("placePlannerPoolItemAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps NO_UNUSED_PLAN_SLOT_FOR_RECIPE to user-friendly error", async () => {
    vi.mocked(placePlannerPoolItemInEntry).mockRejectedValue(
      new Error("NO_UNUSED_PLAN_SLOT_FOR_RECIPE"),
    );

    const result = await placePlannerPoolItemAction({
      logId: "log-1",
      person: "PRIMARY",
      entryId: "entry-1",
      sourceRecipeId: "recipe-1",
      ingredients: [{ ingredientId: "ing-1", unitId: "unit-g", amount: 120 }],
    });

    expect(result).toEqual({
      type: "error",
      message: "No remaining planner slots for this recipe.",
    });
  });
});

describe("clearLogEntryAssignmentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears entry assignment and returns success", async () => {
    vi.mocked(clearLogEntryAssignment).mockResolvedValue(undefined);

    const result = await clearLogEntryAssignmentAction({
      logId: "log-1",
      person: "PRIMARY",
      entryId: "entry-1",
    });

    expect(result).toEqual({ type: "success" });
    expect(clearLogEntryAssignment).toHaveBeenCalledWith({
      logId: "log-1",
      person: "PRIMARY",
      entryId: "entry-1",
    });
  });
});

describe("appendNextLogDayAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid input", async () => {
    const result = await appendNextLogDayAction({ logId: "" });

    expect(result.type).toBe("error");
    expect(appendNextLogDay).not.toHaveBeenCalled();
  });

  it("appends next day and returns date key", async () => {
    vi.mocked(appendNextLogDay).mockResolvedValue({
      type: "success",
      dateKey: "2026-04-04",
      planId: "plan-1",
    });

    const result = await appendNextLogDayAction({ logId: "log-1" });

    expect(result).toEqual({ type: "success", dateKey: "2026-04-04" });
    expect(appendNextLogDay).toHaveBeenCalledWith({ logId: "log-1" });
  });
});

describe("removeLogDayAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid input", async () => {
    const result = await removeLogDayAction({ logId: "", dateKey: "2026-04-10" });

    expect(result.type).toBe("error");
    expect(removeLogDay).not.toHaveBeenCalled();
  });

  it("maps CANNOT_REMOVE_LAST_LOG_DAY to user-friendly error", async () => {
    vi.mocked(removeLogDay).mockRejectedValue(new Error("CANNOT_REMOVE_LAST_LOG_DAY"));

    const result = await removeLogDayAction({ logId: "log-1", dateKey: "2026-04-10" });

    expect(result).toEqual({
      type: "error",
      message: "At least one log day must remain.",
    });
  });

  it("removes day and returns next day key", async () => {
    vi.mocked(removeLogDay).mockResolvedValue({
      type: "success",
      nextDayKey: "2026-04-11",
    });

    const result = await removeLogDayAction({ logId: "log-1", dateKey: "2026-04-10" });

    expect(result).toEqual({ type: "success", nextDayKey: "2026-04-11" });
    expect(removeLogDay).toHaveBeenCalledWith({
      logId: "log-1",
      dateKey: "2026-04-10",
    });
  });
});

describe("deleteLogAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when log id is missing", async () => {
    const result = await deleteLogAction("");
    expect(result).toEqual({ type: "error", message: "Missing log id." });
    expect(deleteLogById).not.toHaveBeenCalled();
  });

  it("deletes log and returns success", async () => {
    vi.mocked(deleteLogById).mockResolvedValue(undefined);
    vi.mocked(getLogs).mockResolvedValue([
      {
        id: "log-2",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        plan: {
          id: "plan-2",
          startDate: new Date("2026-04-10T00:00:00.000Z"),
          endDate: new Date("2026-04-16T00:00:00.000Z"),
        },
      },
    ]);
    const result = await deleteLogAction("log-1");
    expect(result).toEqual({ type: "success", nextLogId: "log-2" });
    expect(deleteLogById).toHaveBeenCalledWith("log-1");
  });
});
