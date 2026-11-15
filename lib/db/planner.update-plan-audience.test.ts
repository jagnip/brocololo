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
  const planSlotFindMany = vi.fn();
  const planSlotUpdateMany = vi.fn();
  const planBatchDeleteMany = vi.fn();
  const planAudienceMemberDeleteMany = vi.fn();
  const planUpdate = vi.fn();
  const planUpdateMany = vi.fn();
  const recipeCount = vi.fn();
  const familyMemberCount = vi.fn();
  const storedMealLotCreate = vi.fn();
  const storedMealLotFindMany = vi.fn();
  const storedMealLotUpdateMany = vi.fn();
  const storedMealLotDeleteMany = vi.fn();
  const storedMealEventCreate = vi.fn();
  const remainderResolutionCreateMany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        plan: { findFirst: planFindFirst, update: planUpdate, updateMany: planUpdateMany },
        logEntry: {
          findMany: logEntryFindMany,
          deleteMany: logEntryDeleteMany,
          upsert: logEntryUpsert,
        },
        planSlotAlternative: { deleteMany: planSlotAlternativeDeleteMany },
        planSlot: {
          deleteMany: planSlotDeleteMany,
          findMany: planSlotFindMany,
          updateMany: planSlotUpdateMany,
        },
        planBatch: { deleteMany: planBatchDeleteMany },
        planAudienceMember: { deleteMany: planAudienceMemberDeleteMany },
        recipe: { count: recipeCount },
        familyMember: { count: familyMemberCount },
        storedMealLot: { create: storedMealLotCreate, findMany: storedMealLotFindMany, updateMany: storedMealLotUpdateMany, deleteMany: storedMealLotDeleteMany },
        storedMealEvent: { create: storedMealEventCreate },
        planBatchRemainderResolution: { createMany: remainderResolutionCreateMany },
      }),
    );
    vi.mocked(prisma.recipe.updateMany).mockResolvedValue({ count: 0 } as never);

    planSlotAlternativeDeleteMany.mockResolvedValue({ count: 0 });
    planSlotDeleteMany.mockResolvedValue({ count: 0 });
    planSlotFindMany.mockResolvedValue([]);
    planSlotUpdateMany.mockResolvedValue({ count: 0 });
    planBatchDeleteMany.mockResolvedValue({ count: 0 });
    planAudienceMemberDeleteMany.mockResolvedValue({ count: 0 });
    planUpdate.mockResolvedValue({ slots: [] });
    planUpdateMany.mockResolvedValue({ count: 1 });
    logEntryDeleteMany.mockResolvedValue({ count: 0 });
    logEntryUpsert.mockResolvedValue({});
    // No date collisions on the newly added day.
    logEntryFindMany.mockResolvedValue([]);
    recipeCount.mockResolvedValue(1);
    familyMemberCount.mockResolvedValue(2);
    storedMealLotCreate.mockResolvedValue({ id: "lot-1" });
    storedMealLotFindMany.mockResolvedValue([]);
    storedMealLotUpdateMany.mockResolvedValue({ count: 1 });
    storedMealLotDeleteMany.mockResolvedValue({ count: 1 });
    storedMealEventCreate.mockResolvedValue({});
    remainderResolutionCreateMany.mockResolvedValue({ count: 1 });
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

  it("persists placement identity across slot recreation without consuming storage", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }), placementId: "placement-1" };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [slot] });

    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 });

    expect(planUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ slots: { create: [expect.objectContaining({ placementId: "placement-1" })] } }),
    }));
    expect(storedMealLotCreate).not.toHaveBeenCalled();
    expect(storedMealEventCreate).not.toHaveBeenCalled();
  });

  it("transfers exact-audience lots before older mismatches and preserves the transfer on autosave", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }), isRolledOver: true, alreadyCooked: true };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [] });
    storedMealLotFindMany.mockResolvedValue([
      { id: "old", recipeId: "recipe-1", count: 2, version: 1, cookedAt: new Date("2026-01-01"), audienceMembers: [{ familyMemberId: "fm-b" }], recipe: { name: "Dinner" } },
      { id: "match", recipeId: "recipe-1", count: 1, version: 2, cookedAt: new Date("2026-02-01"), audienceMembers: [{ familyMemberId: "fm-a" }], recipe: { name: "Dinner" } },
    ]);
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 });
    expect(storedMealLotDeleteMany).toHaveBeenCalledWith({ where: { id: "match", userId: "user-1", version: 2, count: 1 } });
    const event = storedMealEventCreate.mock.calls[0]![0].data;
    expect(event).toEqual(expect.objectContaining({ type: "TRANSFERRED", sourceLotId: "match", destinationPlanId: "plan-1", previousCount: 1, nextCount: 0 }));
    const saved = planUpdate.mock.calls.at(-1)![0].data.slots.create[0];
    expect(saved).toEqual(expect.objectContaining({ placementId: event.placementId, alreadyCooked: true }));
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [{ ...saved, id: "slot", customName: null }] });
    storedMealLotFindMany.mockClear();
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 1 });
    expect(storedMealLotFindMany).not.toHaveBeenCalled();
    expect(planUpdate.mock.calls.at(-1)![0].data.slots.create[0]).toEqual(expect.objectContaining({ placementId: event.placementId, alreadyCooked: true }));
  });

  it("aborts the save when a lot changes concurrently", async () => {
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [] });
    storedMealLotFindMany.mockResolvedValue([{ id: "lot", recipeId: "recipe-1", count: 2, version: 1, cookedAt: new Date(), audienceMembers: [], recipe: { name: "Dinner" } }]);
    storedMealLotUpdateMany.mockResolvedValue({ count: 0 });
    await expect(updatePlan("user-1", "plan-1", [makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] })], { expectedVersion: 0 })).rejects.toThrow("STORED_MEAL_CONFLICT");
    expect(storedMealEventCreate).not.toHaveBeenCalled();
    expect(planUpdate).not.toHaveBeenCalled();
  });

  it("retains a generated placement ID across a move without transferring twice", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), placementId: "generated-id", batchGroupId: "fresh-batch" };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [] });
    storedMealLotFindMany.mockResolvedValue([{ id: "lot", recipeId: "recipe-1", count: 2, version: 0, cookedAt: new Date(), audienceMembers: [], recipe: { name: "Dinner" } }]);
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 });
    const saved = planUpdate.mock.calls.at(-1)![0].data.slots.create[0];
    expect(saved).toEqual(expect.objectContaining({ placementId: "generated-id", alreadyCooked: true, batchGroupId: null }));
    expect(storedMealEventCreate.mock.calls[0]![0].data).toEqual(expect.objectContaining({ placementId: "generated-id", destinationDate: slot.date, destinationMeal: slot.mealType }));
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [{ ...saved, id: "slot", customName: null }] });
    storedMealLotFindMany.mockClear();
    await updatePlan("user-1", "plan-1", [{ ...slot, mealType: PlannerMealType.LUNCH }], { expectedVersion: 1 });
    expect(storedMealLotFindMany).not.toHaveBeenCalled();
    expect(planUpdate.mock.calls.at(-1)![0].data.slots.create[0]).toEqual(expect.objectContaining({ placementId: "generated-id", alreadyCooked: true, batchGroupId: null }));
  });

  it("preserves explicit cooked intent for a new placement when no lot exists", async () => {
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [] });
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), alreadyCooked: true };
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 });
    expect(storedMealLotFindMany).toHaveBeenCalledOnce();
    expect(storedMealEventCreate).not.toHaveBeenCalled();
    expect(planUpdate.mock.calls.at(-1)![0].data.slots.create[0]).toEqual(expect.objectContaining({ alreadyCooked: true }));
  });

  it("does not complete a fresh source when a transferred rolled-over placement is used", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), placementId: "stored", isRolledOver: true, alreadyCooked: true };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [{ ...slot, id: "slot", customName: null }] });
    await updatePlan("user-1", "plan-1", [{ ...slot, used: true }], { expectedVersion: 0 });
    expect(planSlotFindMany).not.toHaveBeenCalled();
  });

  it("rejects duplicate incoming placement IDs before transferring", async () => {
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [] });
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), placementId: "same" };
    await expect(updatePlan("user-1", "plan-1", [slot, { ...slot, mealType: PlannerMealType.LUNCH }], { expectedVersion: 0 })).rejects.toThrow("DUPLICATE_PLACEMENT_ID");
    expect(storedMealLotFindMany).not.toHaveBeenCalled();
  });

  it("rejects changing the meal under an existing placement ID rather than replacing the ID", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), placementId: "same" };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [{ ...slot, id: "slot", customName: null }] });
    await expect(updatePlan("user-1", "plan-1", [{ ...slot, recipeId: "different" }], { expectedVersion: 0 })).rejects.toThrow("PLACEMENT_ID_MEAL_MISMATCH");
    expect(storedMealLotFindMany).not.toHaveBeenCalled();
  });

  it.each([1, 2])("discards planned remainder only when all %i batch placements transfer", async (lotCount) => {
    const first = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), placementId: "first", batchGroupId: "batch-1" };
    const second = { ...first, mealType: PlannerMealType.LUNCH, placementId: "second" };
    const batch = { id: "batch-1", recipeId: "recipe-1", storageRows: [{ count: 3, cookingFamilyMemberIds: [] }] };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, batches: [], slots: [] });
    familyMemberCount.mockResolvedValue(0);
    storedMealLotFindMany.mockResolvedValue([{ id: "lot", recipeId: "recipe-1", count: lotCount, version: 0, cookedAt: new Date(), audienceMembers: [], recipe: { name: "Dinner" } }]);
    await updatePlan("user-1", "plan-1", [first, second], { expectedVersion: 0 }, [batch]);
    const saved = planUpdate.mock.calls.at(-1)![0].data;
    expect(saved.slots.create.map((slot: { placementId: string }) => slot.placementId)).toEqual(["first", "second"]);
    expect(saved.batches.create[0].storageRows.create).toHaveLength(lotCount === 2 ? 0 : 1);
    expect(remainderResolutionCreateMany).toHaveBeenCalledTimes(lotCount === 2 ? 1 : 0);
  });

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
    ], { expectedVersion: 0 });

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
    ], { expectedVersion: 0 });

    const upsertCreates = logEntryUpsert.mock.calls.map(([args]) => args.create);
    const snackMemberIds = upsertCreates
      .filter((row) => row.mealType === LogMealType.SNACK)
      .map((row) => row.familyMemberId);

    expect(snackMemberIds).toEqual(["fm-a"]);
    expect(
      upsertCreates.some((row) => row.familyMemberId === "fm-b"),
    ).toBe(false);
  });

  it("does not mutate older plans when completing a rolled-over meal", async () => {
    const slot = {
      ...makeSlot({
        date: "2026-03-17",
        mealType: PlannerMealType.BREAKFAST,
        cookingFamilyMemberIds: ["fm-a"],
      }),
      isRolledOver: true,
    };
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      createdAt: new Date("2026-03-17T00:00:00.000Z"),
      log: null,
      batches: [],
      slots: [{
        id: "current-slot",
        ...slot,
        used: false,
        customName: null,
        customIngredients: [],
      }],
    });
    await updatePlan("user-1", "plan-1", [{ ...slot, used: true }], { expectedVersion: 0 });

    expect(planUpdateMany).toHaveBeenCalledTimes(1);
    expect(planSlotFindMany).not.toHaveBeenCalled();
    expect(planSlotUpdateMany).not.toHaveBeenCalled();
  });

  it("does not cascade completion from fresh meals", async () => {
    const slot = makeSlot({
      date: "2026-03-17",
      mealType: PlannerMealType.BREAKFAST,
      cookingFamilyMemberIds: ["fm-a"],
    });
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      createdAt: new Date("2026-03-17T00:00:00.000Z"),
      log: null,
      batches: [],
      slots: [{
        id: "current-slot",
        ...slot,
        used: false,
        customName: null,
        customIngredients: [],
      }],
    });

    await updatePlan("user-1", "plan-1", [{ ...slot, used: true }], { expectedVersion: 0 });

    expect(planSlotFindMany).not.toHaveBeenCalled();
    expect(planSlotUpdateMany).not.toHaveBeenCalled();
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
      { expectedVersion: 0 },
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
    expect(await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 }, incoming)).toEqual({ type: "success", version: 1 });
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
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 });
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
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 });
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
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 }, [{ id: "batch-1", recipeId: "recipe-1", storageRows: [], extraPortions: 0 }]);
    expect(planBatchDeleteMany).toHaveBeenCalledWith({ where: { planId: "plan-1", id: { notIn: [] } } });
    expect(planUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ batches: { create: [expect.objectContaining({ storageRows: { create: [] } })] } }),
    }));
  });

  it.each(["omitted", "empty", "provided"])("converts remainder once with %s batches", async (payload) => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }), batchGroupId: "batch-1" };
    const batch = { id: "batch-1", recipeId: "recipe-1", recipe: { name: "Soup" }, storageRows: [{ count: 2, audienceMembers: [{ familyMemberId: "fm-b" }] }] };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, slots: [slot], batches: [batch] });
    familyMemberCount.mockResolvedValue(1);
    const incoming = payload === "provided" ? [{ id: "batch-1", recipeId: "recipe-1", storageRows: [{ count: 2, cookingFamilyMemberIds: ["fm-b"] }] }] : payload === "empty" ? [] : undefined;

    expect(await updatePlan("user-1", "plan-1", [{ ...slot, used: true }], { expectedVersion: 0 }, incoming)).toEqual({ type: "success", version: 1 });
    expect(storedMealLotCreate).toHaveBeenCalledTimes(1);
    expect(storedMealEventCreate).toHaveBeenCalledTimes(1);
    expect(remainderResolutionCreateMany).toHaveBeenCalledWith({ data: [{ planId: "plan-1", batchId: "batch-1" }], skipDuplicates: true });
    expect(planBatchDeleteMany).toHaveBeenCalledWith({ where: { planId: "plan-1", id: { notIn: [] } } });
    expect(planUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ batches: { create: [expect.objectContaining({ id: "batch-1", storageRows: { create: [] } })] } }),
    }));

    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, slots: [{ ...slot, used: true }], batches: [{ ...batch, storageRows: [] }] });
    await updatePlan("user-1", "plan-1", [{ ...slot, used: true }], { expectedVersion: 1 });
    expect(storedMealLotCreate).toHaveBeenCalledTimes(1);
    expect(storedMealEventCreate).toHaveBeenCalledTimes(1);
  });

  it.each([0, 3])("converts the edited remainder count %i rather than stale rows", async (count) => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), batchGroupId: "batch-1" };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, slots: [slot], batches: [{ id: "batch-1", recipeId: "recipe-1", recipe: { name: "Soup" }, storageRows: [{ count: 2, audienceMembers: [] }] }] });
    familyMemberCount.mockResolvedValue(0);
    await updatePlan("user-1", "plan-1", [{ ...slot, used: true }], { expectedVersion: 0 }, [{ id: "batch-1", recipeId: "recipe-1", storageRows: count ? [{ count, cookingFamilyMemberIds: [] }] : [] }]);
    expect(storedMealLotCreate).toHaveBeenCalledTimes(count ? 1 : 0);
    if (count) expect(storedMealLotCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ count }) }));
  });

  it("does not restore or reconvert stale remainder after its lot is gone", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), batchGroupId: "batch-1" };
    const batch = { id: "batch-1", recipeId: "recipe-1", storageRows: [{ count: 2, cookingFamilyMemberIds: [] }] };
    familyMemberCount.mockResolvedValue(0);
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, slots: [{ ...slot, used: false }], batches: [{ id: "batch-1", recipeId: "recipe-1", recipe: { name: "Soup" }, storageRows: [] }], resolvedBatchRemainders: [{ batchId: "batch-1" }] });
    await updatePlan("user-1", "plan-1", [{ ...slot, used: true }], { expectedVersion: 4 }, [batch]);
    expect(storedMealLotCreate).not.toHaveBeenCalled();
    expect(remainderResolutionCreateMany).not.toHaveBeenCalled();
    expect(planUpdate.mock.calls.at(-1)![0].data.batches.create[0].storageRows.create).toEqual([]);
  });

  it("keeps a resolved batch empty if it was deleted and a stale payload recreates it", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: [] }), batchGroupId: "batch-1" };
    familyMemberCount.mockResolvedValue(0);
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, slots: [], batches: [], resolvedBatchRemainders: [{ batchId: "batch-1" }] });
    await updatePlan("user-1", "plan-1", [slot], { expectedVersion: 4 }, [{ id: "batch-1", recipeId: "recipe-1", storageRows: [{ count: 2, cookingFamilyMemberIds: [] }] }]);
    expect(planUpdate.mock.calls.at(-1)![0].data.batches.create[0].storageRows.create).toEqual([]);
  });

  it.each(["date", "sync"])("does not convert on a %s conflict", async (conflict) => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }), batchGroupId: "batch-1" };
    const removed = makeSlot({ date: "2026-03-16", mealType: PlannerMealType.LUNCH, cookingFamilyMemberIds: ["fm-a"] });
    planFindFirst.mockResolvedValue({
      id: "plan-1", log: null, slots: conflict === "sync" ? [slot, removed] : [slot],
      batches: [{ id: "batch-1", recipeId: "recipe-1", recipe: { name: "Soup" }, storageRows: [{ count: 2, audienceMembers: [] }] }],
    });
    if (conflict === "date") {
      logEntryFindMany.mockResolvedValue([{ date: new Date("2026-03-18T00:00:00.000Z"), logId: "other-log", log: { planId: "other-plan" } }]);
    }
    const added = makeSlot({ date: "2026-03-18", mealType: PlannerMealType.LUNCH, cookingFamilyMemberIds: ["fm-a"] });
    const result = await updatePlan("user-1", "plan-1", conflict === "date" ? [{ ...slot, used: true }, added] : [{ ...slot, used: true }], { expectedVersion: 0 });
    expect(result.type).toBe(`${conflict}_conflict`);
    expect(storedMealLotCreate).not.toHaveBeenCalled();
    expect(storedMealEventCreate).not.toHaveBeenCalled();
    expect(planUpdate).toHaveBeenCalledExactlyOnceWith({ where: { id: "plan-1" }, data: { version: 0 } });
    expect(prisma.recipe.updateMany).not.toHaveBeenCalled();
  });

  it("rejects cooked flags for recipes that are not owned batch recipes", async () => {
    const slot = { ...makeSlot({ date: "2026-03-17", mealType: PlannerMealType.DINNER, cookingFamilyMemberIds: ["fm-a"] }), alreadyCooked: true };
    planFindFirst.mockResolvedValue({ id: "plan-1", log: null, slots: [slot], batches: [] });
    recipeCount.mockResolvedValue(0);
    await expect(updatePlan("user-1", "plan-1", [slot], { expectedVersion: 0 })).rejects.toThrow("INVALID_ALREADY_COOKED_RECIPE");
    expect(planSlotDeleteMany).not.toHaveBeenCalled();
    expect(recipeCount).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { in: ["recipe-1"] }, isBatchRecipe: true },
    });
  });
});
