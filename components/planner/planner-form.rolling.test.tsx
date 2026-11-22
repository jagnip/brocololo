import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePlan, savePlan } from "@/actions/planner-actions";
import { createMockRecipe } from "@/lib/tests/test-helpers";
import type { PlanBatchInput, PlanInputType } from "@/types/planner";
import type { PlannerRollingRecipesSection } from "./planner-rolling-recipes-section";
import { PlannerForm } from "./planner-form";

vi.mock("@/actions/planner-actions", () => ({ generatePlan: vi.fn(), savePlan: vi.fn() }));
vi.mock("@/components/topbar-config", () => ({
  TopbarConfigController: ({ config }: { config: { actions: { id: string; label: string; onClick: () => void }[] } }) => (
    <>{config.actions.map((action) => <button key={action.id} onClick={action.onClick}>{action.label}</button>)}</>
  ),
}));
vi.mock("./planner-time-limits-section", () => ({ PlannerTimeLimitsSection: () => null }));
vi.mock("./planner-audience-section", async (importOriginal) => ({
  ...await importOriginal<typeof import("./planner-audience-section")>(),
  PlannerAudienceSection: () => null,
}));
vi.mock("./date-range-picker", () => ({
  getDefaultDateRange: () => ({ start: "2026-03-17", end: "2026-03-18" }),
  WeekPicker: () => null,
}));
vi.mock("./planner-plan-column", () => ({
  PlannerPlanColumn: () => null,
}));
vi.mock("./planner-rolling-recipes-section", () => ({
  PlannerRollingRecipesSection: ({ selected, onChange }: ComponentProps<typeof PlannerRollingRecipesSection>) => (
    <>
      <button type="button" onClick={() => onChange(selected.map((entry) => ({ ...entry, meals: 2 })))}>Change quantity</button>
      <button type="button" onClick={() => onChange(selected.map((entry) => ({ ...entry, alreadyCooked: true })))}>Mark already cooked</button>
      <button type="button" onClick={() => onChange(selected.map((entry) => ({ ...entry, alreadyCooked: false })))}>Mark not cooked</button>
      <button type="button" onClick={() => onChange([])}>Remove rolling selection</button>
    </>
  ),
}));

const recipe = createMockRecipe({ id: "soup", isBatchRecipe: true });
const claim = { id: "queue", version: 4 };
const generatedPlan: PlanInputType = [false, true].map((alreadyCooked, index) => ({
  date: new Date(`2026-03-${17 + index}T00:00:00.000Z`),
  mealType: "DINNER",
  placementId: `placement-${index}`,
  recipe,
  customMeal: null,
  alternatives: [],
  used: false,
  isRolledOver: true,
  alreadyCooked,
  batchGroupId: alreadyCooked ? "cooked" : "planned",
  rollingQueueClaim: alreadyCooked ? null : claim,
}));
const generatedBatches: PlanBatchInput[] = [{
  id: "planned", recipeId: recipe.id, rollingQueueClaim: claim,
  storageRows: [{ count: 3, cookingFamilyMemberIds: ["self"] }],
}];

describe("PlannerForm rolling cooked state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generatePlan).mockResolvedValue({ type: "success", plan: generatedPlan, batches: generatedBatches, warnings: [] });
    vi.mocked(savePlan).mockResolvedValue({ type: "success", planId: "saved" });
  });

  async function generateDraft() {
    render(<PlannerForm
      ingredients={[]}
      recipes={[recipe]}
      previousPlanUnusedMeals={[{ kind: "recipe", recipeId: recipe.id, meals: 5, rollingQueueClaim: claim }]}
      occupiedDateKeys={[]}
      familyMembers={[{ id: "self", name: "Self", isSelf: true, sortOrder: 0, portionMultiplier: 1 }]}
      storedMealLots={[]}
    />);
    fireEvent.click(screen.getAllByRole("button", { name: "Suggest meals for empty slots" })[0]);
    await waitFor(() => expect(generatePlan).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Save plan" })).toBeEnabled());
  }

  it.each(["Change quantity", "Remove rolling selection"])("preserves mixed cooked sources on %s through save", async (action) => {
    await generateDraft();
    fireEvent.click(screen.getByRole("button", { name: action }));
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() => expect(savePlan).toHaveBeenCalledOnce());
    const [plan, batches] = vi.mocked(savePlan).mock.calls[0];
    expect(plan.map((slot) => slot.alreadyCooked)).toEqual([false, true]);
    expect(plan[0].rollingQueueClaim).toEqual(claim);
    expect(batches).toEqual(generatedBatches);
  });

  it("submits no uncooked claim or planned remainder after an explicit cooked toggle", async () => {
    await generateDraft();
    fireEvent.click(screen.getByRole("button", { name: "Mark already cooked" }));
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() => expect(savePlan).toHaveBeenCalledOnce());
    const [plan, batches] = vi.mocked(savePlan).mock.calls[0];
    expect(plan.map((slot) => slot.alreadyCooked)).toEqual([true, true]);
    expect(plan.every((slot) => slot.rollingQueueClaim == null)).toBe(true);
    expect(batches).toEqual([{ ...generatedBatches[0], rollingQueueClaim: null, storageRows: [] }]);
  });

  it("restores only original uncooked provenance and quantities on toggle on, quantity edit, off, save", async () => {
    await generateDraft();
    fireEvent.click(screen.getByRole("button", { name: "Mark already cooked" }));
    fireEvent.click(screen.getByRole("button", { name: "Change quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark not cooked" }));
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() => expect(savePlan).toHaveBeenCalledOnce());
    const [plan, batches] = vi.mocked(savePlan).mock.calls[0];
    expect(plan[0]).toEqual(generatedPlan[0]);
    expect(plan[1]).toEqual({ ...generatedPlan[1], alreadyCooked: false, isRolledOver: false });
    expect(batches).toEqual(generatedBatches);
    expect(batches?.[0]).toMatchObject({
      id: "planned", rollingQueueClaim: { id: "queue", version: 4 },
      storageRows: [{ count: 3, cookingFamilyMemberIds: ["self"] }],
    });
  });

  it("does not replay draft provenance after a successful cooked save", async () => {
    await generateDraft();
    fireEvent.click(screen.getByRole("button", { name: "Mark already cooked" }));
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() => expect(savePlan).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Save plan" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Mark not cooked" }));
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() => expect(savePlan).toHaveBeenCalledTimes(2));
    const [plan, batches] = vi.mocked(savePlan).mock.calls[1];
    expect(plan.every((slot) => !slot.isRolledOver && !slot.alreadyCooked && slot.rollingQueueClaim == null)).toBe(true);
    expect(batches).toEqual([{ ...generatedBatches[0], rollingQueueClaim: null, storageRows: [] }]);
  });
});
