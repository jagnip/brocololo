import { describe, expect, it } from "vitest";
import {
  derivePortionTargetingFromAdjustments,
  resolveIngredientLineForMember,
  resolveIngredientLineForViewer,
  isResolvedLineVisibleForPerson,
  type BaseIngredientRow,
} from "@/lib/recipes/resolve-ingredient-lines";

const baseRow = (
  overrides: Partial<BaseIngredientRow> = {},
): BaseIngredientRow => ({
  id: "ri-1",
  ingredientId: "ing-default",
  amount: 200,
  unitId: "unit-g",
  additionalInfo: null,
  memberAdjustments: [],
  ...overrides,
});

describe("resolveIngredientLineForMember", () => {
  it("returns default row when no adjustments", () => {
    const resolved = resolveIngredientLineForMember(baseRow(), "nelson");
    expect(resolved).toMatchObject({
      kind: "default",
      ingredientId: "ing-default",
      amount: 200,
    });
  });

  it("returns null for SKIP adjustment", () => {
    const resolved = resolveIngredientLineForMember(
      baseRow({
        memberAdjustments: [{ familyMemberId: "jagoda", kind: "SKIP" }],
      }),
      "jagoda",
    );
    expect(resolved).toBeNull();
  });

  it("returns MODIFY override with per-person amount", () => {
    const resolved = resolveIngredientLineForMember(
      baseRow({
        memberAdjustments: [
          {
            familyMemberId: "jagoda",
            kind: "MODIFY",
            ingredientId: "ing-brine",
            amount: 85,
            unitId: "unit-g",
          },
        ],
      }),
      "jagoda",
    );
    expect(resolved).toMatchObject({
      kind: "modify",
      ingredientId: "ing-brine",
      amount: 85,
      batchAmount: 200,
    });
  });
});

describe("resolveIngredientLineForViewer", () => {
  it("returns base row for neutral guest filter", () => {
    const resolved = resolveIngredientLineForViewer(baseRow(), null);
    expect(resolved?.kind).toBe("default");
    expect(resolved?.ingredientId).toBe("ing-default");
  });
});

describe("derivePortionTargetingFromAdjustments", () => {
  const audience = ["nelson", "jagoda"];

  it("maps no skips to appliesToEveryone", () => {
    expect(
      derivePortionTargetingFromAdjustments([], audience),
    ).toEqual({ appliesToEveryone: true, targetFamilyMemberIds: [] });
  });

  it("maps SKIP to exclusive targets", () => {
    expect(
      derivePortionTargetingFromAdjustments(
        [{ familyMemberId: "jagoda", kind: "SKIP" }],
        audience,
      ),
    ).toEqual({
      appliesToEveryone: false,
      targetFamilyMemberIds: ["nelson"],
    });
  });
});

describe("isResolvedLineVisibleForPerson", () => {
  it("hides skipped member but shows others", () => {
    const row = baseRow({
      memberAdjustments: [{ familyMemberId: "jagoda", kind: "SKIP" }],
    });
    expect(isResolvedLineVisibleForPerson(row, "jagoda")).toBe(false);
    expect(isResolvedLineVisibleForPerson(row, "nelson")).toBe(true);
    expect(isResolvedLineVisibleForPerson(row, null)).toBe(true);
  });
});
