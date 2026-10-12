import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlanInputType, SlotInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import { PlanMealChecklist } from "./plan-meal-checklist";

function recipe(id: string, name = id): RecipeType {
  const partial: Partial<RecipeType> = { id, slug: id, name, images: [], servings: 8, plannedMealCount: 4 };
  return partial as RecipeType;
}

function slot(day: number, overrides: Partial<SlotInputType> = {}): SlotInputType {
  return {
    date: new Date(`2026-03-${day}T00:00:00.000Z`),
    mealType: "DINNER",
    recipe: null,
    customMeal: null,
    alternatives: [],
    used: false,
    ...overrides,
  };
}

describe("PlanMealChecklist", () => {
  it.each([false, true])("links the recipe name without toggling cooked state (cooked: %s)", async (used) => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<PlanMealChecklist plan={[slot(17, { recipe: recipe("soup", "Soup"), used })]} onCheckedChange={onCheckedChange} />);

    const link = screen.getByRole("link", { name: "Soup" });
    expect(link).toHaveAttribute("href", "/recipes/soup");
    await user.click(link);
    link.focus();
    await user.keyboard("{Enter}");

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", String(used));
  });

  it.each(["padding", "thumbnail", "count", "checkbox"])("clicking the %s toggles cooked state exactly once", async (target) => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const soup = {
      ...recipe("soup", "Soup"),
      images: [{ id: "image", recipeId: "soup", url: "/soup.jpg", createdAt: new Date(), isCover: true }],
    };
    render(<PlanMealChecklist plan={[slot(17, { recipe: soup })]} onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox");
    const targets = {
      padding: checkbox.parentElement!.parentElement!,
      thumbnail: screen.getByAltText(""),
      count: screen.getByLabelText("1 planned slots"),
      checkbox,
    };
    await user.click(targets[target as keyof typeof targets]);

    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(["2026-03-17T00:00:00.000Z-DINNER"], true);
  });

  it("groups recipes by ID, keeps identical names with different IDs separate, and counts occurrences rather than servings", () => {
    const plan: PlanInputType = [
      slot(17, { recipe: recipe("soup-a", "Soup") }),
      slot(18, { recipe: recipe("soup-a", "Soup") }),
      slot(19, { recipe: recipe("soup-b", "Soup") }),
      slot(20),
    ];

    render(<PlanMealChecklist plan={plan} onCheckedChange={vi.fn()} />);

    const dinner = within(screen.getByRole("region", { name: "Dinner" }));
    expect(dinner.getAllByRole("checkbox", { name: "Mark all Soup slots cooked" })).toHaveLength(2);
    expect(dinner.getAllByRole("listitem")).toHaveLength(2);
    expect(dinner.getByText("2 meals left")).toBeInTheDocument();
    expect(dinner.getByLabelText("2 planned slots")).toHaveTextContent("2×");
    expect(dinner.getByLabelText("1 planned slots")).toHaveTextContent("1×");
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("uses the first chronological meal type across unsorted slots, including same-day meal ordering", () => {
    const plan: PlanInputType = [
      slot(19, { recipe: recipe("soup", "Soup"), mealType: "BREAKFAST" }),
      slot(18, { recipe: recipe("toast", "Toast"), mealType: "DINNER" }),
      slot(17, { recipe: recipe("soup", "Soup"), mealType: "DINNER" }),
      slot(18, { recipe: recipe("toast", "Toast"), mealType: "BREAKFAST" }),
      slot(17, { recipe: recipe("soup", "Soup"), mealType: "LUNCH" }),
    ];

    render(<PlanMealChecklist plan={plan} onCheckedChange={vi.fn()} />);

    const breakfast = within(screen.getByRole("region", { name: "Breakfast" }));
    const lunch = within(screen.getByRole("region", { name: "Lunch" }));
    const dinner = within(screen.getByRole("region", { name: "Dinner" }));
    expect(breakfast.getByRole("checkbox", { name: "Mark all Toast slots cooked" })).toBeInTheDocument();
    expect(lunch.getByRole("checkbox", { name: "Mark all Soup slots cooked" })).toBeInTheDocument();
    expect(breakfast.getByText("1 meal left")).toBeInTheDocument();
    expect(lunch.getByLabelText("3 planned slots")).toHaveTextContent("3×");
    expect(dinner.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(dinner.getByText("0 meals left")).toBeInTheDocument();
    expect(plan[0].date.toISOString()).toBe("2026-03-19T00:00:00.000Z");
  });

  it("merges custom meals with reordered identical ingredients but separates different amounts and recipe identities", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const rice = { ingredientId: "rice", unitId: "g", amount: 100 };
    const beans = { ingredientId: "beans", unitId: null, amount: null };
    const plan: PlanInputType = [
      slot(19, { customMeal: { name: "Bowl", ingredients: [beans, rice] } }),
      slot(17, { customMeal: { name: "Bowl", ingredients: [rice, beans] } }),
      slot(18, { customMeal: { name: "Bowl", ingredients: [{ ...rice, amount: 200 }, beans] } }),
      slot(20, { recipe: recipe("bowl", "Bowl") }),
    ];

    render(<PlanMealChecklist plan={plan} onCheckedChange={onCheckedChange} />);

    const rows = screen.getAllByRole("listitem");
    expect(screen.getAllByRole("checkbox", { name: "Mark all Bowl slots cooked" })).toHaveLength(3);
    expect(within(rows[0]).getByLabelText("2 planned slots")).toHaveTextContent("2×");
    expect(within(rows[1]).getByLabelText("1 planned slots")).toHaveTextContent("1×");
    expect(within(rows[2]).getByLabelText("1 planned slots")).toHaveTextContent("1×");

    await user.click(within(rows[0]).getByText("Bowl"));

    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith([
      "2026-03-17T00:00:00.000Z-DINNER",
      "2026-03-19T00:00:00.000Z-DINNER",
    ], true);
  });

  it.each([
    { state: "unchecked", used: [false, false], ariaChecked: "false", cooked: "false" },
    { state: "mixed", used: [true, false], ariaChecked: "mixed", cooked: "false" },
    { state: "checked", used: [true, true], ariaChecked: "true", cooked: "true" },
  ])("exposes $state through aria-checked and data-cooked", ({ used, ariaChecked, cooked }) => {
    const plan: PlanInputType = used.map((value, index) => slot(17 + index, {
      recipe: recipe("soup", "Soup"),
      used: value,
    }));

    render(<PlanMealChecklist plan={plan} onCheckedChange={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "Mark all Soup slots cooked" })).toHaveAttribute("aria-checked", ariaChecked);
    expect(screen.getByRole("listitem")).toHaveAttribute("data-cooked", cooked);
    expect(within(screen.getByRole("region", { name: "Dinner" })).getByText(
      cooked === "true" ? "0 meals left" : "1 meal left",
    )).toBeInTheDocument();
  });

  it.each(["click", "Space"] as const)("%s invokes the callback with all matching slot keys and a boolean for every state", async (interaction) => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const plan: PlanInputType = [
      slot(19, { recipe: recipe("soup", "Soup") }),
      slot(18, { recipe: recipe("other", "Other") }),
      slot(17, { recipe: recipe("soup", "Soup"), mealType: "LUNCH" }),
    ];
    const { rerender } = render(<PlanMealChecklist plan={plan} onCheckedChange={onCheckedChange} />);

    for (const [used, expected] of [
      [[false, false], true],
      [[true, false], true],
      [[true, true], false],
    ] as const) {
      const changed: PlanInputType = plan.map((entry, index) => ({
        ...entry,
        used: index === 0 ? used[0] : index === 2 ? used[1] : false,
      }));
      rerender(<PlanMealChecklist plan={changed} onCheckedChange={onCheckedChange} />);
      onCheckedChange.mockClear();

      if (interaction === "click") {
        await user.click(screen.getByRole("checkbox", { name: "Mark all Soup slots cooked" }));
      } else {
        screen.getByRole("checkbox", { name: "Mark all Soup slots cooked" }).focus();
        await user.keyboard(" ");
      }

      expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith([
        "2026-03-17T00:00:00.000Z-LUNCH",
        "2026-03-19T00:00:00.000Z-DINNER",
      ], expected);
    }
  });

  it("updates cooked state, counts, grouping, and callback keys when the plan changes", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const plan: PlanInputType = [
      slot(17, { recipe: recipe("soup", "Soup") }),
      slot(18, { recipe: recipe("soup", "Soup") }),
    ];
    const { rerender } = render(<PlanMealChecklist plan={plan} onCheckedChange={onCheckedChange} />);

    const cooked: PlanInputType = plan.map((entry) => ({ ...entry, used: true }));
    rerender(<PlanMealChecklist plan={cooked} onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("listitem")).toHaveAttribute("data-cooked", "true");
    expect(within(screen.getByRole("region", { name: "Dinner" })).getByText("0 meals left")).toBeInTheDocument();

    const changed: PlanInputType = [
      cooked[1],
      slot(19, { recipe: recipe("toast", "Toast"), mealType: "BREAKFAST" }),
      slot(20, { recipe: recipe("soup", "Soup"), mealType: "LUNCH" }),
    ];
    rerender(<PlanMealChecklist plan={changed} onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("checkbox", { name: "Mark all Soup slots cooked" })).toHaveAttribute("aria-checked", "mixed");
    expect(within(screen.getByRole("region", { name: "Dinner" })).getByRole("listitem")).toHaveAttribute("data-cooked", "false");
    expect(screen.getByLabelText("2 planned slots")).toHaveTextContent("2×");
    expect(within(screen.getByRole("region", { name: "Dinner" })).getByText("1 meal left")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Breakfast" })).getByText("Toast")).toBeInTheDocument();

    await user.click(screen.getByLabelText("2 planned slots"));
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith([
      "2026-03-18T00:00:00.000Z-DINNER",
      "2026-03-20T00:00:00.000Z-LUNCH",
    ], true);

    rerender(<PlanMealChecklist plan={[changed[2]]} onCheckedChange={onCheckedChange} />);
    const lunch = within(screen.getByRole("region", { name: "Lunch" }));
    expect(lunch.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
    expect(lunch.getByLabelText("1 planned slots")).toHaveTextContent("1×");
    expect(screen.queryByText("Toast")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Dinner" })).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it.each<{ plan: PlanInputType }>([
    { plan: [] },
    { plan: [slot(17), slot(18, { alternatives: [recipe("alternative")] })] },
  ])("renders null when no slot has a meal (%#)", ({ plan }) => {
    const { container } = render(<PlanMealChecklist plan={plan} onCheckedChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("region", { name: "Meal checklist" })).not.toBeInTheDocument();
  });

  it("shows only meal-group headings and omits the removed title, progress, helper, and action buttons", () => {
    const plan: PlanInputType = [slot(17, { recipe: recipe("soup", "Soup"), used: true })];

    render(<PlanMealChecklist plan={plan} onCheckedChange={vi.fn()} />);

    const checklist = within(screen.getByRole("region", { name: "Meal checklist" }));
    expect(checklist.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "Breakfast",
      "Lunch",
      "Dinner",
    ]);
    expect(checklist.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(checklist.queryByRole("button")).not.toBeInTheDocument();
    expect(checklist.queryByText(/meal checklist|cooked|mark all|uncheck all|check off|track your/i)).not.toBeInTheDocument();
    expect(checklist.queryByText(/\d+\s*(?:\/|of)\s*\d+/i)).not.toBeInTheDocument();
  });
});
