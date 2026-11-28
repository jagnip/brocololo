import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlannerMealType } from "@/src/generated/client";
import { prisma } from "@/lib/db";
import { getPlanBatchesById, getPlanById } from "@/lib/db/planner";
import { getSavedPlanEditorData } from "./saved-plan-editor";

vi.mock("@/lib/db", () => ({
  prisma: { plan: { findFirst: vi.fn() } },
}));

vi.mock("@/lib/db/planner", () => ({
  getPlanById: vi.fn(),
  getPlanBatchesById: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe("getSavedPlanEditorData", () => {
  it.each(["resolved", "storage-only"])(
    "excludes a %s batch from the editable payload without changing stored data",
    async (kind) => {
      vi.mocked(prisma.plan.findFirst).mockResolvedValue({ version: 3 } as never);
      const slots = [{
        id: "slot-1",
        placementId: "placement-1",
        date: new Date("2026-10-12T00:00:00.000Z"),
        mealType: PlannerMealType.DINNER,
        recipe: { id: "recipe-1" },
        customMeal: null,
        alternatives: [],
        cookingFamilyMemberIds: ["member-1"],
        used: false,
        isRolledOver: false,
        alreadyCooked: false,
        extraPortions: 0,
        batchGroupId: "active-batch",
      }];
      const activeBatch = { id: "active-batch", recipeId: "recipe-1", storageRows: [] };
      const historicalBatch = {
        id: "historical-batch",
        recipeId: "recipe-1",
        storageRows: kind === "storage-only"
          ? [{ count: 2, cookingFamilyMemberIds: ["member-1"] }]
          : [],
      };
      const batches = [activeBatch, historicalBatch];
      vi.mocked(getPlanById).mockResolvedValue(slots as never);
      vi.mocked(getPlanBatchesById).mockResolvedValue(batches);

      expect(await getSavedPlanEditorData("user-1", "plan-1")).toEqual({
        slots,
        batches: [activeBatch],
        version: 3,
      });
      expect(batches).toEqual([activeBatch, historicalBatch]);
      expect(getPlanById).toHaveBeenCalledWith("user-1", "plan-1");
      expect(getPlanBatchesById).toHaveBeenCalledWith("user-1", "plan-1");
    },
  );

  it("returns null for a missing or inaccessible plan", async () => {
    vi.mocked(prisma.plan.findFirst).mockResolvedValue(null);

    expect(await getSavedPlanEditorData("user-1", "plan-1")).toBeNull();
    expect(getPlanById).not.toHaveBeenCalled();
    expect(getPlanBatchesById).not.toHaveBeenCalled();
  });
});
