import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogMealType, PlannerMealType } from "@/src/generated/client";
import { createBaselineLogTx } from "./planner";
import type { SlotInputType } from "@/types/planner";

describe("createBaselineLogTx snack provisioning", () => {
  const logCreateMock = vi.fn();
  const familyMemberFindManyMock = vi.fn();
  const logEntryCreateMock = vi.fn();
  const logEntryUpsertMock = vi.fn();

  const tx = {
    log: { create: logCreateMock },
    familyMember: { findMany: familyMemberFindManyMock },
    logEntry: { create: logEntryCreateMock, upsert: logEntryUpsertMock },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    logCreateMock.mockResolvedValue({ id: "log-1" });
    familyMemberFindManyMock.mockResolvedValue([{ id: "fm-1" }]);
    logEntryCreateMock.mockResolvedValue({});
    logEntryUpsertMock.mockResolvedValue({});
  });

  function makeSlot(date: string, mealType: PlannerMealType): SlotInputType {
    return {
      date: new Date(`${date}T00:00:00.000Z`),
      mealType,
      recipe: null,
      customMeal: null,
      alternatives: [],
      cookingFamilyMemberIds: ["fm-1"],
      used: false,
    };
  }

  it("upserts one SNACK entry per unique plan date per cooking member", async () => {
    const slots = [
      makeSlot("2026-03-17", PlannerMealType.BREAKFAST),
      makeSlot("2026-03-17", PlannerMealType.LUNCH),
      makeSlot("2026-03-18", PlannerMealType.DINNER),
    ];

    await createBaselineLogTx(tx as never, "user-1", "plan-1", slots);

    const snackUpserts = logEntryUpsertMock.mock.calls.filter(
      ([args]) => args.create.mealType === LogMealType.SNACK,
    );
    expect(snackUpserts).toHaveLength(2);
    expect(snackUpserts.map(([args]) => args.create.date.toISOString().slice(0, 10))).toEqual(
      expect.arrayContaining(["2026-03-17", "2026-03-18"]),
    );
  });

  it("creates snack rows for each cooking family member", async () => {
    familyMemberFindManyMock.mockResolvedValue([{ id: "fm-1" }, { id: "fm-2" }]);

    await createBaselineLogTx(tx as never, "user-1", "plan-1", [
      makeSlot("2026-03-17", PlannerMealType.BREAKFAST),
    ]);

    const snackUpserts = logEntryUpsertMock.mock.calls.filter(
      ([args]) => args.create.mealType === LogMealType.SNACK,
    );
    expect(snackUpserts).toHaveLength(2);
    expect(snackUpserts.map(([args]) => args.create.familyMemberId)).toEqual(
      expect.arrayContaining(["fm-1", "fm-2"]),
    );
  });

  it("creates meal log entries only for people included on each slot", async () => {
    familyMemberFindManyMock.mockResolvedValue([{ id: "fm-1" }, { id: "fm-2" }]);

    await createBaselineLogTx(tx as never, "user-1", "plan-1", [
      {
        ...makeSlot("2026-03-17", PlannerMealType.BREAKFAST),
        cookingFamilyMemberIds: ["fm-1"],
      },
      {
        ...makeSlot("2026-03-17", PlannerMealType.LUNCH),
        cookingFamilyMemberIds: ["fm-2"],
      },
    ]);

    const mealCreates = logEntryCreateMock.mock.calls.map(([args]) => args.data);
    expect(mealCreates).toHaveLength(2);
    expect(mealCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          familyMemberId: "fm-1",
          mealType: PlannerMealType.BREAKFAST,
        }),
        expect.objectContaining({
          familyMemberId: "fm-2",
          mealType: PlannerMealType.LUNCH,
        }),
      ]),
    );
  });
});
