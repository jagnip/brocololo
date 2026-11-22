import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePlan, savePlan, updateSavedPlan, deletePlanAction } from "./planner-actions";
import { getRecipes } from "@/lib/db/recipes";
import { listRollingMealQueue } from "@/lib/db/rolling-meals";
import { createPlan, updatePlan, deletePlanById } from "@/lib/db/planner";
import { revalidatePath } from "next/cache";
import { createMockCategory, createMockRecipe } from "@/lib/tests/test-helpers";
import { getDaysInRange } from "@/lib/planner/helpers";
import type { PlanBatchInput, PlanInputType, SlotSaveData } from "@/types/planner";
import type { RollingMealType } from "@/lib/validations/planner";

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("@/lib/db/family-members", () => ({ listFamilyMembers: vi.fn().mockResolvedValue([{ id: "alice" }]) }));
vi.mock("@/lib/db/recipes", () => ({ getRecipes: vi.fn() }));
vi.mock("@/lib/db/rolling-meals", () => ({ listRollingMealQueue: vi.fn() }));
vi.mock("@/lib/db/planner", () => ({
  createPlan: vi.fn(), updatePlan: vi.fn(), deletePlanById: vi.fn(),
  generateBaselineLogForPlan: vi.fn().mockResolvedValue({ type: "success" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const start = new Date("2026-11-23T00:00:00.000Z");
const end = new Date("2026-11-29T00:00:00.000Z");
const recipe = createMockRecipe({
  id: "soup", name: "Soup", isBatchRecipe: true, plannedMealCount: 1,
  handsOnTime: 10, totalTime: 10,
  categories: [createMockCategory({ slug: "dinner", type: "MEAL_OCCASION" })],
});
const token = { id: "queue", version: 4 };
const rolling: RollingMealType = {
  kind: "recipe", recipeId: "soup", meals: 6, rollingQueueClaim: token,
  source: { storedMeals: 2, unfinishedScheduledMeals: 99 },
};

async function generate(entries: RollingMealType[] = [rolling], plan: PlanInputType = [], batches: PlanBatchInput[] = [], lastDay = end) {
  const audience = getDaysInRange(start, lastDay).map((day) => ({
    date: day.toISOString().slice(0, 10),
    breakfastFamilyMemberIds: ["alice"], lunchFamilyMemberIds: ["alice"], dinnerFamilyMemberIds: ["alice"],
  }));
  return generatePlan(start, lastDay, audience, [], [], entries, plan, batches);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRecipes).mockResolvedValue([recipe]);
  vi.mocked(listRollingMealQueue).mockResolvedValue([{ kind: "recipe", ...token, recipeId: "soup", name: "Soup", count: 2 }]);
});

describe("generation source budgets", () => {
  it("splits cooked, authoritative uncooked and fresh excess into separate groups without writes", async () => {
    const result = await generate();
    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    const slots = result.plan.filter((slot) => slot.recipe);
    expect(slots.filter((slot) => slot.alreadyCooked)).toHaveLength(2);
    expect(slots.filter((slot) => slot.rollingQueueClaim)).toHaveLength(2);
    expect(slots.filter((slot) => slot.rollingQueueClaim).every((slot) => !slot.alreadyCooked)).toBe(true);
    expect(slots.slice(4, 6).every((slot) => !slot.isRolledOver && !slot.rollingQueueClaim)).toBe(true);
    expect(new Set(slots.slice(0, 6).map((slot) => slot.batchGroupId)).size).toBe(3);
    expect(listRollingMealQueue).toHaveBeenCalledWith("user", { includeCurrent: true, beforeDate: start });
    expect(listRollingMealQueue).toHaveBeenCalledWith("user", { includeCurrent: true });
    expect(createPlan).not.toHaveBeenCalled();
    expect(updatePlan).not.toHaveBeenCalled();
    expect(deletePlanById).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reserves existing cooked and claimed placements before filling", async () => {
    const first = await generate();
    if (first.type !== "success") throw new Error("Generation failed");
    const retained = first.plan.filter((slot) => slot.recipe).slice(0, 3);
    const retainedIds = new Set(retained.map((slot) => slot.batchGroupId));
    const second = await generate([rolling], retained, first.batches.filter((batch) => retainedIds.has(batch.id)));
    expect(second.type).toBe("success");
    if (second.type !== "success") return;
    expect(second.plan.filter((slot) => slot.alreadyCooked)).toHaveLength(2);
    expect(second.plan.filter((slot) => slot.rollingQueueClaim)).toHaveLength(2);
  });

  it("keeps the entire uncooked remainder claimed, but fresh excess in a separate claimless batch", async () => {
    const entry: RollingMealType = { kind: "recipe", recipeId: "soup", meals: 4, rollingQueueClaim: token };
    const first = await generate([entry], [], [], start);
    if (first.type !== "success") throw new Error("Generation failed");
    expect(first.plan.find((slot) => slot.recipe)?.rollingQueueClaim).toEqual(token);
    expect(first.batches).toMatchObject([{ rollingQueueClaim: token, storageRows: [{ count: 1 }] }]);
    const second = await generate([entry], first.plan, first.batches, new Date("2026-11-24T00:00:00.000Z"));
    if (second.type !== "success") throw new Error("Generation failed");
    expect(second.plan.filter((slot) => slot.rollingQueueClaim)).toHaveLength(1);
    expect(second.batches.find((batch) => batch.id !== first.batches[0].id)).toMatchObject({ storageRows: [{ count: 1 }] });
    expect(second.batches.find((batch) => batch.id !== first.batches[0].id)?.rollingQueueClaim).toBeUndefined();
  });

  it("manual Already cooked never carries an uncooked queue claim", async () => {
    vi.mocked(listRollingMealQueue).mockResolvedValue([]);
    const result = await generate([{ ...rolling, meals: 3, alreadyCooked: true }]);
    if (result.type !== "success") throw new Error("Generation failed");
    const cooked = result.plan.filter((slot) => slot.alreadyCooked);
    expect(cooked).toHaveLength(3);
    expect(cooked.every((slot) => !slot.rollingQueueClaim)).toBe(true);
    expect(result.batches.every((batch) => !batch.rollingQueueClaim && batch.storageRows.length === 0)).toBe(true);
  });

  it("surfaces migration blocking during authoritative generation reads", async () => {
    vi.mocked(listRollingMealQueue).mockRejectedValueOnce(Object.assign(new Error("Migration needed"), { code: "ROLLING_MIGRATION_REQUIRED" }));
    await expect(generate()).resolves.toEqual({ type: "error", message: expect.stringContaining("Contact support, then reload this page.") });
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("bounds custom claims without relying on editable source metadata", async () => {
    const customMeal = { name: "Toast", ingredients: [] };
    vi.mocked(listRollingMealQueue).mockResolvedValue([{ kind: "custom", ...token, mealType: "BREAKFAST", customMeal, name: "Toast", count: 1 }]);
    const result = await generate([{ kind: "custom", mealType: "BREAKFAST", customMeal, meals: 3, rollingQueueClaim: { ...token, mealType: "BREAKFAST" } }]);
    if (result.type !== "success") throw new Error("Generation failed");
    const custom = result.plan.filter((slot) => slot.customMeal);
    expect(custom).toHaveLength(3);
    expect(custom.filter((slot) => slot.rollingQueueClaim)).toHaveLength(1);
    expect(custom.slice(1).every((slot) => !slot.isRolledOver && !slot.rollingQueueClaim)).toBe(true);
    const second = await generate([{ kind: "custom", mealType: "BREAKFAST", customMeal, meals: 3, rollingQueueClaim: { ...token, mealType: "BREAKFAST" } }], custom.slice(0, 1));
    if (second.type !== "success") throw new Error("Generation failed");
    expect(second.plan.filter((slot) => slot.rollingQueueClaim)).toHaveLength(1);
    expect(second.plan.filter((slot) => slot.customMeal)).toHaveLength(3);
  });

  it("rejects stale tokens with reload instructions", async () => {
    vi.mocked(listRollingMealQueue).mockResolvedValue([{ kind: "recipe", id: "queue", version: 5, recipeId: "soup", name: "Soup", count: 2 }]);
    await expect(generate()).resolves.toEqual({ type: "error", message: expect.stringContaining("Reload the page") });
  });

  it("treats date-ineligible selected quantities as fresh without moving current or future units", async () => {
    vi.mocked(listRollingMealQueue).mockImplementation(async (_userId, options) => options?.beforeDate ? [] : [
      { kind: "recipe", ...token, recipeId: "soup", name: "Soup", count: 2 },
    ]);
    const result = await generate([{ ...rolling, meals: 4, source: { storedMeals: 1, unfinishedScheduledMeals: 3 } }]);
    if (result.type !== "success") throw new Error("Generation failed");
    expect(result.plan.filter((slot) => slot.alreadyCooked)).toHaveLength(1);
    expect(result.plan.some((slot) => slot.rollingQueueClaim)).toBe(false);
    expect(result.batches.some((batch) => batch.rollingQueueClaim)).toBe(false);
    expect(result.plan.filter((slot) => slot.recipe).slice(1, 4).every((slot) => !slot.isRolledOver)).toBe(true);
  });

  it("preserves persisted same-plan placements and remainder without offering them again", async () => {
    vi.mocked(listRollingMealQueue).mockImplementation(async (_userId, options) => options?.beforeDate ? [] : [
      { kind: "recipe", ...token, recipeId: "soup", name: "Soup", count: 2 },
    ]);
    const retained: PlanInputType = [{ id: "saved-slot", placementId: "saved-placement", date: start, mealType: "DINNER", recipe, customMeal: null, alternatives: [], used: false, batchGroupId: "saved-batch", rollingQueueClaim: token, isRolledOver: true }];
    const batches: PlanBatchInput[] = [{ id: "saved-batch", recipeId: "soup", rollingQueueClaim: token, storageRows: [{ count: 1, cookingFamilyMemberIds: ["alice"] }] }];
    const result = await generate([{ kind: "recipe", recipeId: "soup", meals: 3, rollingQueueClaim: token }], retained, batches);
    if (result.type !== "success") throw new Error("Generation failed");
    expect(result.plan.filter((slot) => slot.rollingQueueClaim)).toEqual(retained);
    expect(result.batches.filter((batch) => batch.rollingQueueClaim)).toEqual(batches);
    expect(result.plan.filter((slot) => slot.recipe && !slot.id).every((slot) => !slot.rollingQueueClaim && !slot.isRolledOver)).toBe(true);
  });

  it("uses only the strictly preceding count from a broader selected identity", async () => {
    vi.mocked(listRollingMealQueue).mockImplementation(async (_userId, options) => [
      { kind: "recipe", ...token, recipeId: "soup", name: "Soup", count: options?.beforeDate ? 1 : 4 },
    ]);
    const result = await generate([{ kind: "recipe", recipeId: "soup", meals: 4, rollingQueueClaim: token }]);
    if (result.type !== "success") throw new Error("Generation failed");
    expect(result.plan.filter((slot) => slot.rollingQueueClaim)).toHaveLength(1);
    expect(result.batches.some((batch) => batch.rollingQueueClaim)).toBe(false);
  });

  it("rejects retained claims above authoritative availability, including remainder", async () => {
    const retained: PlanInputType = [{ date: start, mealType: "DINNER", recipe, customMeal: null, alternatives: [], used: false, batchGroupId: "retained", rollingQueueClaim: token, isRolledOver: true }];
    const batches: PlanBatchInput[] = [{ id: "retained", recipeId: "soup", rollingQueueClaim: token, storageRows: [{ count: 2, cookingFamilyMemberIds: ["alice"] }] }];
    await expect(generate([rolling], retained, batches)).resolves.toEqual({ type: "error", message: expect.stringContaining("Reload the page") });
  });

  it("reserves retained quantities even when an edited total crosses source boundaries", async () => {
    const first = await generate();
    if (first.type !== "success") throw new Error("Generation failed");
    const retained = first.plan.filter((slot) => slot.rollingQueueClaim);
    const entry: RollingMealType = { ...rolling, meals: 3 };
    const second = await generate([entry], retained);
    if (second.type !== "success") throw new Error("Generation failed");
    expect(second.plan.filter((slot) => slot.rollingQueueClaim)).toHaveLength(2);
    expect(second.plan.filter((slot) => slot.alreadyCooked)).toHaveLength(1);
  });

  it("rejects invalid requested quantities before source allocation", async () => {
    await expect(generate([{ ...rolling, meals: -1 }])).resolves.toMatchObject({ type: "error" });
    expect(listRollingMealQueue).not.toHaveBeenCalled();
  });
});

describe("rolling lifecycle action results", () => {
  const plan: PlanInputType = [{ date: start, mealType: "DINNER", recipe, customMeal: null, alternatives: [], used: false, cookingFamilyMemberIds: ["alice"] }];
  const slots: SlotSaveData[] = [{ date: start, mealType: "DINNER", recipeId: recipe.id, customMeal: null, alternativeRecipeIds: [], cookingFamilyMemberIds: ["alice"], used: false }];

  it.each(["ROLLING_QUEUE_CONFLICT", "ROLLING_BATCH_REMAINDER_REQUIRED", "ROLLING_MIGRATION_REQUIRED"])("surfaces %s on save, completion and delete", async (code) => {
    vi.mocked(createPlan).mockRejectedValueOnce(new Error(code));
    vi.mocked(updatePlan).mockRejectedValueOnce(Object.assign(new Error("Lifecycle blocked"), { code }));
    vi.mocked(deletePlanById).mockRejectedValueOnce(new Error(code));
    const saved = await savePlan(plan);
    if (code === "ROLLING_QUEUE_CONFLICT") expect(saved).toEqual({ type: "rolling_conflict" });
    else expect(saved).toMatchObject({ type: "error", message: expect.stringMatching(/reload/i) });
    expect(await updateSavedPlan("plan", slots, { expectedVersion: 1 })).toMatchObject({ type: "error", message: expect.stringMatching(/reload/i) });
    expect(await deletePlanAction("plan")).toMatchObject({ type: "error", message: expect.stringMatching(/reload/i) });
  });

  it("invalidates Storage and new-plan suggestions after save, completion and deletion", async () => {
    vi.mocked(createPlan).mockResolvedValueOnce({ type: "success", plan: { id: "plan" } } as Awaited<ReturnType<typeof createPlan>>);
    vi.mocked(updatePlan).mockResolvedValueOnce({ type: "success", version: 2 });
    vi.mocked(deletePlanById).mockResolvedValueOnce(undefined);
    await savePlan(plan);
    expect(revalidatePath).toHaveBeenCalledWith("/storage");
    expect(revalidatePath).toHaveBeenCalledWith("/plan/create");
    vi.mocked(revalidatePath).mockClear();
    await updateSavedPlan("plan", slots, { expectedVersion: 1 });
    expect(revalidatePath).toHaveBeenCalledWith("/storage");
    expect(revalidatePath).toHaveBeenCalledWith("/plan/create");
    vi.mocked(revalidatePath).mockClear();
    await deletePlanAction("plan");
    expect(revalidatePath).toHaveBeenCalledWith("/storage");
    expect(revalidatePath).toHaveBeenCalledWith("/plan/create");
  });
});
