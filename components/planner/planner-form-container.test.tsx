import { describe, expect, it, vi } from "vitest";
import PlannerFormContainer from "./planner-form-container";
import { listRollingMealQueue } from "@/lib/db/rolling-meals";

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("@/lib/db/ingredients", () => ({ getIngredients: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/recipes", () => ({ getRecipes: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/planner", () => ({ getOccupiedDateKeysForPlanning: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/family-members", () => ({ ensureSelfFamilyMember: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/storage", () => ({ listStoredMealLots: vi.fn().mockResolvedValue([
  { recipe: { id: "soup", archivedAt: null, excludeFromPlanner: false }, count: 2 },
]) }));
vi.mock("@/lib/db/rolling-meals", () => ({
  listRollingMealQueue: vi.fn().mockResolvedValue([{ kind: "recipe", id: "queue", version: 4, recipeId: "soup", count: 3 }]),
}));
vi.mock("./planner-form", () => ({ PlannerForm: () => null }));

describe("PlannerFormContainer", () => {
  it("combines stored and queued meals while retaining the queue claim", async () => {
    const element = await PlannerFormContainer();
    expect(listRollingMealQueue).toHaveBeenCalledExactlyOnceWith("user", { includeCurrent: true });
    expect(element.props.previousPlanUnusedMeals).toEqual([{
      kind: "recipe", recipeId: "soup", meals: 5,
      rollingQueueClaim: { id: "queue", version: 4 },
      source: { storedMeals: 2, unfinishedScheduledMeals: 3 },
    }]);
  });
});
