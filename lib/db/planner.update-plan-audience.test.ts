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
  const planAudienceMemberDeleteMany = vi.fn();
  const planUpdate = vi.fn();

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
        planAudienceMember: { deleteMany: planAudienceMemberDeleteMany },
      }),
    );
    vi.mocked(prisma.recipe.updateMany).mockResolvedValue({ count: 0 } as never);

    planSlotAlternativeDeleteMany.mockResolvedValue({ count: 0 });
    planSlotDeleteMany.mockResolvedValue({ count: 0 });
    planAudienceMemberDeleteMany.mockResolvedValue({ count: 0 });
    planUpdate.mockResolvedValue({ slots: [] });
    logEntryDeleteMany.mockResolvedValue({ count: 0 });
    logEntryUpsert.mockResolvedValue({});
    // No date collisions on the newly added day.
    logEntryFindMany.mockResolvedValue([]);
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
});
