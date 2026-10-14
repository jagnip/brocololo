import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { Form } from "@/components/ui/form";
import { createMockRecipe } from "@/lib/tests/test-helpers";
import type { PlannerCriteriaInputType, RollingRecipeType } from "@/lib/validations/planner";
import { PlannerRollingRecipesSection } from "./planner-rolling-recipes-section";

vi.mock("@/components/ui/multiselect", () => ({
  default: ({ value, onChange }: {
    value: Array<{ value: string; label: string }>;
    onChange: (value: Array<{ value: string; label: string }>) => void;
  }) => (
    <div>
      {value.map((option) => (
        <button key={option.value} type="button" onClick={() => onChange(value.filter((item) => item.value !== option.value))}>
          Remove {option.label}
        </button>
      ))}
      <button type="button" onClick={() => onChange([...value, { value: "batch", label: "Soup" }])}>Add Soup</button>
    </div>
  ),
}));

const recipes = [
  createMockRecipe({ id: "batch", name: "Soup", isBatchRecipe: true, plannedMealCount: 1 }),
  createMockRecipe({ id: "single", name: "Salad", isBatchRecipe: false, plannedMealCount: 1 }),
];

function Harness() {
  const form = useForm<PlannerCriteriaInputType>({ defaultValues: { fridgeIngredientIds: [] } });
  const [selected, setSelected] = useState<RollingRecipeType[]>([
    { recipeId: "batch", meals: 3, alreadyCooked: false },
    { recipeId: "single", meals: 2, alreadyCooked: false },
  ]);
  return (
    <Form {...form}>
      <PlannerRollingRecipesSection
        control={form.control}
        selected={selected}
        onChange={setSelected}
        ingredients={[]}
        recipes={recipes}
      />
      <output aria-label="Rolling state">{JSON.stringify(selected)}</output>
    </Form>
  );
}

describe("PlannerRollingRecipesSection", () => {
  it("edits every rolling count and offers an unchecked cooked option only for batches", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole("button", { name: "Use previous leftovers" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Unused meals from your previous plan/)).not.toBeInTheDocument();
    expect(screen.queryByText("10 min prep")).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Rolling meals for Salad" })).toHaveValue(2);
    const checkbox = screen.getByRole("checkbox", { name: "Already cooked Soup" });
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Already cooked Salad" })).not.toBeInTheDocument();
    await user.click(checkbox);
    expect(screen.getByLabelText("Rolling state")).toHaveTextContent('"alreadyCooked":true');
  });

  it("keeps removal stable and resets count/cooked state when manually re-added", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: "Already cooked Soup" }));
    await user.click(screen.getByRole("button", { name: "Remove Soup" }));
    expect(screen.queryByRole("spinbutton", { name: "Rolling meals for Soup" })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Add Soup" })[0]);
    expect(screen.getByRole("spinbutton", { name: "Rolling meals for Soup" })).toHaveValue(1);
    expect(screen.getByRole("checkbox", { name: "Already cooked Soup" })).not.toBeChecked();
  });
});
