import { describe, expect, it } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import {
  buildCookingCombinationsFromSlots,
  getBatchGroupSlotsForRecipe,
  getRecipeCookingHref,
  resolveSlotAudienceIds,
} from "@/lib/planner/plan-recipe-link";
import type { PlanInputType, SlotInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";

const J = "member-jagoda";
const N = "member-nelson";
const G = "member-gloria";
const K = "member-klaudia";
const HOUSEHOLD = [J, N, G, K];

function createRecipe(
  id: string,
  overrides: Partial<RecipeType> = {},
): RecipeType {
  return {
    id,
    name: id,
    slug: id,
    isBatchRecipe: false,
    plannedMealCount: 1,
    ...overrides,
  } as RecipeType;
}

function dinnerSlot(
  dateIso: string,
  recipe: RecipeType | null,
  overrides: Partial<SlotInputType> = {},
): SlotInputType {
  return {
    date: new Date(dateIso),
    mealType: PlannerMealType.DINNER,
    recipe,
    customMeal: null,
    alternatives: [],
    used: false,
    cookingFamilyMemberIds: [],
    batchGroupId: null,
    ...overrides,
  };
}

describe("resolveSlotAudienceIds", () => {
  it("uses explicit slot eaters when present", () => {
    expect(
      resolveSlotAudienceIds({ cookingFamilyMemberIds: [J, G] }, HOUSEHOLD),
    ).toEqual([J, G]);
  });

  it("falls back to the household when the slot has no eaters", () => {
    expect(
      resolveSlotAudienceIds({ cookingFamilyMemberIds: [] }, HOUSEHOLD),
    ).toEqual(HOUSEHOLD);
    expect(
      resolveSlotAudienceIds({ cookingFamilyMemberIds: undefined }, HOUSEHOLD),
    ).toEqual(HOUSEHOLD);
  });
});

describe("getBatchGroupSlotsForRecipe", () => {
  it("returns chronological slots matching both group and recipe id", () => {
    const recipe = createRecipe("r-caprese", { isBatchRecipe: true });
    const other = createRecipe("r-other");
    const plan: PlanInputType = [
      dinnerSlot("2026-03-19T00:00:00.000Z", recipe, {
        batchGroupId: "g1",
        cookingFamilyMemberIds: [J],
      }),
      dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
        batchGroupId: "g1",
        cookingFamilyMemberIds: [J, N],
      }),
      dinnerSlot("2026-03-18T00:00:00.000Z", other, {
        batchGroupId: "g1",
      }),
    ];

    const slots = getBatchGroupSlotsForRecipe(plan, "g1", recipe.id);
    expect(slots.map((slot) => slot.date.toISOString().slice(0, 10))).toEqual([
      "2026-03-17",
      "2026-03-19",
    ]);
  });
});

describe("buildCookingCombinationsFromSlots", () => {
  it("collapses consecutive identical audiences", () => {
    const recipe = createRecipe("r-1");
    const slots = [
      dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [J, N],
      }),
      dinnerSlot("2026-03-18T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [N, J],
      }),
      dinnerSlot("2026-03-19T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [J],
      }),
    ];

    expect(buildCookingCombinationsFromSlots(slots)).toEqual([
      { count: 2, memberIds: [J, N] },
      { count: 1, memberIds: [J] },
    ]);
  });

  it("applies household fallback for empty slot audiences", () => {
    const recipe = createRecipe("r-1");
    const slots = [
      dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [],
      }),
      dinnerSlot("2026-03-18T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [],
      }),
    ];

    expect(buildCookingCombinationsFromSlots(slots, HOUSEHOLD)).toEqual([
      { count: 2, memberIds: HOUSEHOLD },
    ]);
  });
});

describe("getRecipeCookingHref", () => {
  it("builds a cook query for a single non-batch slot with eaters", () => {
    const recipe = createRecipe("bolognese");
    const slot = dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
      cookingFamilyMemberIds: [J, N],
    });

    expect(getRecipeCookingHref(recipe.slug, [slot], HOUSEHOLD)).toBe(
      `/recipes/bolognese?cook=${encodeURIComponent(`${J},${N}:1`)}`,
    );
  });

  it("collapses identical batch audiences into one combination", () => {
    const recipe = createRecipe("caprese", { isBatchRecipe: true });
    const slots = [
      dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [J, N],
        batchGroupId: "g1",
      }),
      dinnerSlot("2026-03-18T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [J, N],
        batchGroupId: "g1",
      }),
    ];

    expect(getRecipeCookingHref(recipe.slug, slots, HOUSEHOLD)).toBe(
      `/recipes/caprese?cook=${encodeURIComponent(`${J},${N}:2`)}`,
    );
  });

  it("preserves differing audiences as multiple combinations", () => {
    const recipe = createRecipe("caprese", { isBatchRecipe: true });
    const slots = [
      dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [J, N],
      }),
      dinnerSlot("2026-03-18T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [J, N],
      }),
      dinnerSlot("2026-03-19T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [J],
      }),
    ];

    expect(getRecipeCookingHref(recipe.slug, slots, HOUSEHOLD)).toBe(
      `/recipes/caprese?cook=${encodeURIComponent(`${J},${N}:2;${J}:1`)}`,
    );
  });

  it("always attaches cook, using household when slot eaters are empty", () => {
    const recipe = createRecipe("pork-stir-fry");
    const slot = dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
      cookingFamilyMemberIds: [],
    });

    expect(getRecipeCookingHref(recipe.slug, [slot], HOUSEHOLD)).toBe(
      `/recipes/pork-stir-fry?cook=${encodeURIComponent(`${J},${N},${G},${K}:1`)}`,
    );
  });

  it("encodes multi-meal empty audiences as household × meal count", () => {
    const recipe = createRecipe("caprese", { isBatchRecipe: true });
    const slots = [
      dinnerSlot("2026-03-17T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [],
        batchGroupId: "g1",
      }),
      dinnerSlot("2026-03-18T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [],
        batchGroupId: "g1",
      }),
      dinnerSlot("2026-03-19T00:00:00.000Z", recipe, {
        cookingFamilyMemberIds: [],
        batchGroupId: "g1",
      }),
    ];

    expect(getRecipeCookingHref(recipe.slug, slots, HOUSEHOLD)).toBe(
      `/recipes/caprese?cook=${encodeURIComponent(`${J},${N},${G},${K}:3`)}`,
    );
  });
});
