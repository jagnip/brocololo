import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogMealType, PlannerMealType } from "@/src/generated/client";
import { updatePlan } from "./planner";
import type { SlotSaveData } from "@/types/planner";

vi.mock("./index", () => ({
  prisma: {
    $transaction: vi.fn(),
    recipe: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "./index";

describe("updatePlan added-date log entries respect slot audience", () => {
  const planFindFirst = vi.fn();
  const logEntryFindMany = vi.fn();
  const logEntryDeleteMany = vi.fn();
  const logEntryUpsert = vi.fn();
  const planSlotAlternativeDeleteMany = vi.fn();
  const planSlotDeleteMany = vi.fn();
  const planBatchDeleteMany = vi.fn();
  const planAudienceMemberDeleteMany = vi.fn();
  const planUpdate = vi.fn();
  const recipeCount = vi.fn();
  const familyMemberCount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        plan: { findFirst: planFindFirst, update: planUpdate },
        logEntry: {
          findMany: logEntryFindMany,
          deleteMany: logEntryDeleteMany,
          upsert: logEntryUpsert,
        },
        planSlotAlternative: { deleteMany: planSlotAlternativeDeleteMany },
        planSlot: { deleteMany: planSlotDeleteMany },
        planBatch: { deleteMany: planBatchDeleteMany },
        planAudienceMember: { deleteMany: planAudienceMemberDeleteMany },
        recipe: { count: recipeCount },
        familyMember: { count: familyMemberCount },
      }),
    );
    vi.mocked(prisma.recipe.updateMany).mockResolvedValue({ count: 0 } as never);

    planSlotAlternativeDeleteMany.mockResolvedValue({ count: 0 });
    planSlotDeleteMany.mockResolvedValue({ count: 0 });
    planBatchDeleteMany.mockResolvedValue({ count: 0 });
    planAudienceMemberDeleteMany.mockResolvedValue({ count: 0 });
    planUpdate.mockResolvedValue({ slots: [] });
    logEntryDeleteMany.mockResolvedValue({ count: 0 });
    logEntryUpsert.mockResolvedValue({});
    // No date collisions on the newly added day.
    logEntryFindMany.mockResolvedValue([]);
    recipeCount.mockResolvedValue(1);
    familyMemberCount.mockResolvedValue(2);
  });

  function makeSlot(params: {
    date: string;
    mealType: PlannerMealType;
    cookingFamilyMemberIds: string[];
    recipeId?: string | null;
  }): SlotSaveData {
    return {
      date: new Date(`${params.date}T00:00:00.000Z`),
      mealType: params.mealType,
      recipeId: params.recipeId ?? "recipe-1",
      customMeal: null,
      alternativeRecipeIds: [],
      cookingFamilyMemberIds: params.cookingFamilyMemberIds,
      used: false,
    };
  }

  it("creates meal + snack log entries only for assigned eaters on added dates", async () => {
    // Existing plan covers only 2026-03-17; save payload extends to 2026-03-18.
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      log: { id: "log-1" },
      batches: [],
      slots: [
        {
          date: new Date("2026-03-17T00:00:00.000Z"),
          recipeId: "recipe-1",
          customName: null,
        },
      ],
    });

    await updatePlan("user-1", "plan-1", [
      makeSlot({
        date: "2026-03-17",
        mealType: PlannerMealType.BREAKFAST,
        cookingFamilyMemberIds: ["fm-a", "fm-b"],
      }),
      makeSlot({
        date: "2026-03-18",
        mealType: PlannerMealType.LUNCH,
        cookingFamilyMemberIds: ["fm-a"],
      }),
      makeSlot({
        date: "2026-03-18",
        mealType: PlannerMealType.DINNER,
        cookingFamilyMemberIds: ["fm-b"],
      }),
    ]);

    const upsertCreates = logEntryUpsert.mock.calls.map(([args]) => args.create);

    // Lunch → only fm-a; Dinner → only fm-b; SNACK → both (each assigned ≥1 meal that day).
    expect(upsertCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          familyMemberId: "fm-a",
          mealType: LogMealType.LUNCH,
        }),
        expect.objectContaining({
          familyMemberId: "fm-b",
          mealType: LogMealType.DINNER,
        }),
        expect.objectContaining({
          familyMemberId: "fm-a",
          mealType: LogMealType.SNACK,
        }),
        expect.objectContaining({
          familyMemberId: "fm-b",
          mealType: LogMealType.SNACK,
        }),
      ]),
    );
    expect(upsertCreates).toHaveLength(4);

    // fm-b must not get a LUNCH entry; fm-a must not get a DINNER entry.
    expect(
      upsertCreates.some(
        (row) =>
          row.familyMemberId === "fm-b" && row.mealType === LogMealType.LUNCH,
      ),
    ).toBe(false);
    expect(
      upsertCreates.some(
        (row) =>
          row.familyMemberId === "fm-a" && row.mealType === LogMealType.DINNER,
      ),
    ).toBe(false);
  });

  it("does not create snack for a member with no meals on the added date", async () => {
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      log: { id: "log-1" },
      batches: [],
      slots: [
        {
          date: new Date("2026-03-17T00:00:00.000Z"),
          recipeId: "recipe-1",
          customName: null,
        },
      ],
    });

    await updatePlan("user-1", "plan-1", [
      makeSlot({
        date: "2026-03-17",
        mealType: PlannerMealType.BREAKFAST,
        cookingFamilyMemberIds: ["fm-a", "fm-b"],
      }),
      // New day: only fm-a eats
      makeSlot({
        date: "2026-03-18",
        mealType: PlannerMealType.BREAKFAST,
        cookingFamilyMemberIds: ["fm-a"],
      }),
    ]);

    const upsertCreates = logEntryUpsert.mock.calls.map(([args]) => args.create);
    const snackMemberIds = upsertCreates
      .filter((row) => row.mealType === LogMealType.SNACK)
      .map((row) => row.familyMemberId);

    expect(snackMemberIds).toEqual(["fm-a"]);
    expect(
      upsertCreates.some((row) => row.familyMemberId === "fm-b"),
    ).toBe(false);
  });

  it("recreates batch storage independently from recreated slots", async () => {
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      log: null,
      batches: [],
      slots: [
        {
          date: new Date("2026-03-17T00:00:00.000Z"),
          recipeId: "recipe-1",
          customName: null,
        },
      ],
    });

    await updatePlan(
      "user-1",
      "plan-1",
      [
        {
          ...makeSlot({
            date: "2026-03-17",
            mealType: PlannerMealType.DINNER,
            cookingFamilyMemberIds: ["jagoda"],
          }),
          batchGroupId: "batch-1",
        },
      ],
      {},
      [
        {
          id: "batch-1",
          recipeId: "recipe-1",
          storageRows: [
            {
              count: 2,
              cookingFamilyMemberIds: ["jagoda", "nelson"],
            },
          ],
        },
      ],
    );

    expect(planBatchDeleteMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", id: { notIn: [] } },
    });
    expect(recipeCount).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        id: { in: ["recipe-1"] },
        isBatchRecipe: true,
      },
    });
    expect(planUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          batches: {
            create: [
              expect.objectContaining({
                id: "batch-1",
                recipeId: "recipe-1",
              }),
            ],
          },
        }),
      }),
    );
  });

  it.each([
    undefined,
    [],
  ])("preserves legacy rows with a matching scheduled group and batches %j", async (incoming) => {
    familyMemberCount.mockResolvedValue(0);
    const slot = {
      ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }),
      batchGroupId: "batch-1",
      isRolledOver: true,
      alreadyCooked: true,
    };
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      log: null,
      slots: [slot],
      batches: [{
        id: "batch-1",
        recipeId: "recipe-1",
        extraPortions: 3,
        storageRows: [{ count: 2, audienceMembers: [{ familyMemberId: "fm-b" }] }],
      }],
    });
    expect(await updatePlan("user-1", "plan-1", [slot], {}, incoming)).toEqual({ type: "success" });
    expect(planBatchDeleteMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", id: { notIn: ["batch-1"] } },
    });
    expect(planUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        batches: { create: [] },
        audienceMembers: { create: [{ familyMemberId: "fm-a" }, { familyMemberId: "fm-b" }] },
        slots: { create: [expect.objectContaining({ isRolledOver: true, alreadyCooked: true })] },
      }),
    }));
  });

  it("deletes legacy storage when its last scheduled meal is removed", async () => {
    const slot = makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] });
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      log: null,
      slots: [{ ...slot, batchGroupId: "batch-1" }],
      batches: [{ id: "batch-1", recipeId: "recipe-1", storageRows: [] }],
    });
    await updatePlan("user-1", "plan-1", [slot]);
    expect(planBatchDeleteMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", id: { notIn: [] } },
    });
    expect(planUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        slots: { create: [expect.objectContaining({ isRolledOver: false, alreadyCooked: false })] },
      }),
    }));
  });

  it("preserves a legacy storage-only batch during an unrelated edit", async () => {
    const slot = makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] });
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      log: null,
      slots: [slot],
      batches: [{
        id: "storage-only",
        recipeId: "another-recipe",
        storageRows: [{ count: 2, audienceMembers: [{ familyMemberId: "fm-b" }] }],
      }],
    });
    await updatePlan("user-1", "plan-1", [slot]);
    expect(planBatchDeleteMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", id: { notIn: ["storage-only"] } },
    });
  });

  it("allows explicitly saving an empty storage list", async () => {
    familyMemberCount.mockResolvedValue(0);
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }), batchGroupId: "batch-1" };
    planFindFirst.mockResolvedValue({
      id: "plan-1", log: null, slots: [slot],
      batches: [{ id: "batch-1", recipeId: "recipe-1", extraPortions: 0, storageRows: [{ count: 2, audienceMembers: [{ familyMemberId: "fm-a" }] }] }],
    });
    await updatePlan("user-1", "plan-1", [slot], {}, [{ id: "batch-1", recipeId: "recipe-1", storageRows: [], extraPortions: 0 }]);
    expect(planBatchDeleteMany).toHaveBeenCalledWith({ where: { planId: "plan-1", id: { notIn: [] } } });
    expect(planUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ batches: { create: [expect.objectContaining({ storageRows: { create: [] } })] } }),
    }));
  });

  it("rejects cooked flags for recipes that are not owned batch recipes", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }), alreadyCooked: true };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, slots: [slot], batches: [] });
    recipeCount.mockResolvedValue(0);
    await expect(updatePlan("user-1", "plan-1", [slot])).rejects.toThrow("INVALID_ALREADY_COOKED_RECIPE");
    expect(planSlotDeleteMany).not.toHaveBeenCalled();
    expect(recipeCount).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { in: ["recipe-1"] }, isBatchRecipe: true },
    });
  });
});
