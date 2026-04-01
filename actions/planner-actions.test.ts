import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlan, updatePlan } from "@/lib/db/planner";
import { savePlan, updateSavedPlan } from "./planner-actions";

vi.mock("@/lib/db/planner", () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlanById: vi.fn(),
  generateBaselineLogForPlan: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("planner-actions collisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("savePlan forwards date_conflict from createPlan", async () => {
    vi.mocked(createPlan).mockResolvedValueOnce({
      type: "date_conflict",
      dates: ["2026-04-08"],
      conflictingLogIds: ["log-2"],
      conflictingPlanIds: ["plan-2"],
    } as any);

    const result = await savePlan([
      {
        date: new Date("2026-04-08T00:00:00.000Z"),
        mealType: "DINNER" as any,
        recipe: null,
        alternatives: [],
        used: false,
      },
    ]);

    expect(result).toEqual({
      type: "date_conflict",
      dates: ["2026-04-08"],
      conflictingLogIds: ["log-2"],
      conflictingPlanIds: ["plan-2"],
    });
  });

  it("updateSavedPlan forwards date_conflict from updatePlan", async () => {
    vi.mocked(updatePlan).mockResolvedValueOnce({
      type: "date_conflict",
      dates: ["2026-04-08"],
      conflictingLogIds: ["log-2"],
      conflictingPlanIds: ["plan-2"],
    } as any);

    const result = await updateSavedPlan("plan-1", [
      {
        date: new Date("2026-04-08T00:00:00.000Z"),
        mealType: "DINNER" as any,
        recipeId: null,
        alternativeRecipeIds: [],
        used: false,
      },
    ]);

    expect(result).toEqual({
      type: "date_conflict",
      dates: ["2026-04-08"],
      conflictingLogIds: ["log-2"],
      conflictingPlanIds: ["plan-2"],
    });
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePlanById, updatePlan } from "@/lib/db/planner";
import { revalidatePath } from "next/cache";
import { deletePlanAction, updateSavedPlan } from "./planner-actions";
import { ROUTES } from "@/lib/constants";

vi.mock("@/lib/db/planner", () => ({
  updatePlan: vi.fn(),
  generateBaselineLogForPlan: vi.fn(),
  createPlan: vi.fn(),
  deletePlanById: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateSavedPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates root on success", async () => {
    vi.mocked(updatePlan).mockResolvedValue({} as never);

    const result = await updateSavedPlan("plan-1", [
      {
        date: new Date("2026-03-30T00:00:00.000Z"),
        mealType: "DINNER",
        recipeId: "recipe-1",
        alternativeRecipeIds: [],
        used: false,
      },
    ]);

    expect(result).toEqual({ type: "success" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("returns error when update fails", async () => {
    vi.mocked(updatePlan).mockRejectedValue(new Error("db failed"));

    const result = await updateSavedPlan("plan-1", [
      {
        date: new Date("2026-03-30T00:00:00.000Z"),
        mealType: "DINNER",
        recipeId: "recipe-1",
        alternativeRecipeIds: [],
        used: false,
      },
    ]);

    expect(result).toEqual({ type: "error", message: "Failed to update plan." });
  });
});

describe("deletePlanAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when plan id is missing", async () => {
    const result = await deletePlanAction("");
    expect(result).toEqual({ type: "error", message: "Missing plan id." });
    expect(deletePlanById).not.toHaveBeenCalled();
  });

  it("deletes plan and returns success", async () => {
    vi.mocked(deletePlanById).mockResolvedValue(undefined);
    const result = await deletePlanAction("plan-1");
    expect(result).toEqual({ type: "success" });
    expect(deletePlanById).toHaveBeenCalledWith("plan-1");
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.planCurrent);
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.log);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});
