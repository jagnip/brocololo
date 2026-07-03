import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertPlanSlotAvailableForMemberTx,
  getPlannerPoolItemsForPlan,
  getPlanSlotIdsLinkedToMember,
  reserveNextUnusedPlanSlotTx,
} from "./planner";
import {
  clearLogEntryAssignment,
  placePlannerPoolItemInEntry,
} from "./logs";

vi.mock("./index", () => ({
  prisma: {
    logEntryRecipe: {
      findMany: vi.fn(),
    },
    plan: {
      findFirst: vi.fn(),
    },
    familyMember: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./index";

describe("getPlanSlotIdsLinkedToMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns plan slot ids linked to the member's log entries", async () => {
    vi.mocked(prisma.logEntryRecipe.findMany).mockResolvedValue([
      { planSlotId: "slot-1" },
      { planSlotId: "slot-2" },
      { planSlotId: null },
    ] as never);

    const linked = await getPlanSlotIdsLinkedToMember({
      planId: "plan-1",
      familyMemberId: "fm-a",
    });

    expect(linked).toEqual(new Set(["slot-1", "slot-2"]));
    expect(prisma.logEntryRecipe.findMany).toHaveBeenCalledWith({
      where: {
        planSlotId: { not: null },
        entry: {
          log: { planId: "plan-1" },
          familyMemberId: "fm-a",
        },
      },
      select: { planSlotId: true },
    });
  });
});

describe("assertPlanSlotAvailableForMemberTx", () => {
  const planSlotFindFirst = vi.fn();
  const logEntryRecipeFindFirst = vi.fn();
  const tx = {
    planSlot: { findFirst: planSlotFindFirst },
    logEntryRecipe: { findFirst: logEntryRecipeFindFirst },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the slot is Manage-skipped (used)", async () => {
    planSlotFindFirst.mockResolvedValue({ id: "slot-1", used: true });

    await expect(
      assertPlanSlotAvailableForMemberTx({
        tx: tx as never,
        planId: "plan-1",
        planSlotId: "slot-1",
        familyMemberId: "fm-a",
      }),
    ).rejects.toThrow("NO_UNUSED_PLAN_SLOT");
  });

  it("throws when this person already logged the slot", async () => {
    planSlotFindFirst.mockResolvedValue({ id: "slot-1", used: false });
    logEntryRecipeFindFirst.mockResolvedValue({ id: "link-1" });

    await expect(
      assertPlanSlotAvailableForMemberTx({
        tx: tx as never,
        planId: "plan-1",
        planSlotId: "slot-1",
        familyMemberId: "fm-a",
      }),
    ).rejects.toThrow("NO_UNUSED_PLAN_SLOT");
  });

  it("passes when the slot is available for this person", async () => {
    planSlotFindFirst.mockResolvedValue({ id: "slot-1", used: false });
    logEntryRecipeFindFirst.mockResolvedValue(null);

    await expect(
      assertPlanSlotAvailableForMemberTx({
        tx: tx as never,
        planId: "plan-1",
        planSlotId: "slot-1",
        familyMemberId: "fm-a",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("reserveNextUnusedPlanSlotTx", () => {
  const logEntryRecipeFindMany = vi.fn();
  const planSlotFindFirst = vi.fn();
  const planSlotUpdateMany = vi.fn();
  const tx = {
    logEntryRecipe: { findMany: logEntryRecipeFindMany },
    planSlot: { findFirst: planSlotFindFirst, updateMany: planSlotUpdateMany },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    logEntryRecipeFindMany.mockResolvedValue([]);
    planSlotUpdateMany.mockResolvedValue({ count: 0 });
  });

  it("returns the first unlinked slot for this person without toggling used", async () => {
    planSlotFindFirst.mockResolvedValue({ id: "slot-2" });

    const result = await reserveNextUnusedPlanSlotTx({
      tx: tx as never,
      planId: "plan-1",
      recipeId: "recipe-1",
      familyMemberId: "fm-a",
    });

    expect(result).toBe("slot-2");
    expect(planSlotUpdateMany).not.toHaveBeenCalled();
    expect(planSlotFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planId: "plan-1",
          recipeId: "recipe-1",
          used: false,
        }),
      }),
    );
  });

  it("excludes slots already linked to this person", async () => {
    logEntryRecipeFindMany.mockResolvedValue([{ planSlotId: "slot-1" }]);
    planSlotFindFirst.mockResolvedValue({ id: "slot-2" });

    await reserveNextUnusedPlanSlotTx({
      tx: tx as never,
      planId: "plan-1",
      recipeId: "recipe-1",
      familyMemberId: "fm-a",
    });

    expect(planSlotFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ["slot-1"] },
        }),
      }),
    );
  });
});

describe("getPlannerPoolItemsForPlan", () => {
  const slotDate = new Date("2026-03-17T00:00:00.000Z");

  function makePlanSlot(overrides: {
    id: string;
    used?: boolean;
    recipeName?: string;
  }) {
    return {
      id: overrides.id,
      date: slotDate,
      mealType: "DINNER",
      used: overrides.used ?? false,
      recipe: overrides.recipeName
        ? {
            id: "recipe-1",
            name: overrides.recipeName,
            servings: 2,
            images: [],
            ingredients: [],
            memberPortions: [],
          }
        : null,
      customMeal: null,
      alternatives: [],
      cookingFamilyMemberIds: ["fm-a", "fm-b"],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.familyMember.findMany).mockResolvedValue([
      { id: "fm-a", isSelf: true },
      { id: "fm-b", isSelf: false },
    ] as never);
  });

  it("hides Manage-skipped slots from everyone", async () => {
    vi.mocked(prisma.plan.findFirst).mockResolvedValue({
      audienceMembers: [{ familyMemberId: "fm-a" }],
      slots: [
        {
          ...makePlanSlot({ id: "slot-skipped", used: true, recipeName: "Pasta" }),
        },
        {
          ...makePlanSlot({ id: "slot-open", recipeName: "Salad" }),
        },
      ],
    } as never);
    vi.mocked(prisma.logEntryRecipe.findMany).mockResolvedValue([]);

    const items = await getPlannerPoolItemsForPlan({
      userId: "user-1",
      planId: "plan-1",
      familyMemberId: "fm-a",
    });

    expect(items.map((item) => item.planSlotId)).toEqual(["slot-open"]);
  });

  it("hides slots already logged by the selected person but not other people", async () => {
    vi.mocked(prisma.plan.findFirst).mockResolvedValue({
      audienceMembers: [{ familyMemberId: "fm-a" }],
      slots: [makePlanSlot({ id: "slot-1", recipeName: "Pasta" })],
    } as never);

    vi.mocked(prisma.logEntryRecipe.findMany).mockImplementation(async (args) => {
      const memberId = (
        args as { where: { entry: { familyMemberId: string } } }
      ).where.entry.familyMemberId;
      if (memberId === "fm-a") {
        return [{ planSlotId: "slot-1" }];
      }
      return [];
    });

    const poolForA = await getPlannerPoolItemsForPlan({
      userId: "user-1",
      planId: "plan-1",
      familyMemberId: "fm-a",
    });
    const poolForB = await getPlannerPoolItemsForPlan({
      userId: "user-1",
      planId: "plan-1",
      familyMemberId: "fm-b",
    });

    expect(poolForA).toHaveLength(0);
    expect(poolForB).toHaveLength(1);
    expect(poolForB[0]?.planSlotId).toBe("slot-1");
  });
});

describe("placePlannerPoolItemInEntry", () => {
  const logFindFirst = vi.fn();
  const logEntryFindFirst = vi.fn();
  const planSlotFindFirst = vi.fn();
  const logEntryRecipeFindFirst = vi.fn();
  const logIngredientDeleteMany = vi.fn();
  const logEntryRecipeDeleteMany = vi.fn();
  const logEntryRecipeCreate = vi.fn();
  const logIngredientCreateMany = vi.fn();
  const ingredientFindMany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        log: { findFirst: logFindFirst },
        logEntry: { findFirst: logEntryFindFirst },
        planSlot: { findFirst: planSlotFindFirst },
        logEntryRecipe: {
          findFirst: logEntryRecipeFindFirst,
          deleteMany: logEntryRecipeDeleteMany,
          create: logEntryRecipeCreate,
        },
        logIngredient: {
          deleteMany: logIngredientDeleteMany,
          createMany: logIngredientCreateMany,
        },
        ingredient: { findMany: ingredientFindMany },
      } as never),
    );

    logFindFirst.mockResolvedValue({ id: "log-1", planId: "plan-1" });
    logEntryFindFirst.mockResolvedValue({ id: "entry-a" });
    planSlotFindFirst.mockResolvedValue({ id: "slot-1", used: false });
    logEntryRecipeFindFirst.mockResolvedValue(null);
    logEntryRecipeCreate.mockResolvedValue({ id: "er-1" });
    logIngredientDeleteMany.mockResolvedValue({ count: 0 });
    logEntryRecipeDeleteMany.mockResolvedValue({ count: 0 });
    logIngredientCreateMany.mockResolvedValue({ count: 0 });
    ingredientFindMany.mockResolvedValue([]);
  });

  it("links the plan slot without toggling global used", async () => {
    await placePlannerPoolItemInEntry("user-1", {
      logId: "log-1",
      familyMemberId: "fm-a",
      entryId: "entry-a",
      sourceRecipeId: "recipe-1",
      planSlotId: "slot-1",
      ingredients: [],
    });

    expect(logEntryRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planSlotId: "slot-1",
          entryId: "entry-a",
        }),
      }),
    );
  });
});

describe("clearLogEntryAssignment", () => {
  const logFindFirst = vi.fn();
  const logEntryFindFirst = vi.fn();
  const logIngredientDeleteMany = vi.fn();
  const logEntryRecipeDeleteMany = vi.fn();
  const planSlotUpdateMany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        log: { findFirst: logFindFirst },
        logEntry: { findFirst: logEntryFindFirst },
        logIngredient: { deleteMany: logIngredientDeleteMany },
        logEntryRecipe: { deleteMany: logEntryRecipeDeleteMany },
        planSlot: { updateMany: planSlotUpdateMany },
      } as never),
    );

    logFindFirst.mockResolvedValue({ id: "log-1" });
    logEntryFindFirst.mockResolvedValue({ id: "entry-a" });
    logIngredientDeleteMany.mockResolvedValue({ count: 0 });
    logEntryRecipeDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("clears the log entry without resetting global plan slot used", async () => {
    await clearLogEntryAssignment("user-1", {
      logId: "log-1",
      familyMemberId: "fm-a",
      entryId: "entry-a",
    });

    expect(logEntryRecipeDeleteMany).toHaveBeenCalled();
    expect(planSlotUpdateMany).not.toHaveBeenCalled();
  });
});
