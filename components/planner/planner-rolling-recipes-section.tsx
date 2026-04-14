"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RollingRecipeType } from "@/lib/validations/planner";
import type { RecipeType } from "@/types/recipe";
import MultipleSelector from "@/components/ui/multiselect";

type PlannerRollingRecipesSectionProps = {
  selected: RollingRecipeType[];
  onChange: (next: RollingRecipeType[]) => void;
  recipes: RecipeType[];
  previousPlanUnusedRecipes: RollingRecipeType[];
};

export function PlannerRollingRecipesSection({
  selected,
  onChange,
  recipes,
  previousPlanUnusedRecipes,
}: PlannerRollingRecipesSectionProps) {
  return (
    <FormItem>
      {/* Bulk-add action sits above the rolling recipes selector. */}
      <Button
        type="button"
        variant="outline"
        size="default"
        className="w-max"
        disabled={previousPlanUnusedRecipes.length === 0}
        onClick={() => {
          const currentIds = new Set(selected.map((r) => r.recipeId));
          const toAdd = previousPlanUnusedRecipes.filter(
            (r) => !currentIds.has(r.recipeId),
          );

          if (toAdd.length === 0) {
            toast.info("All unused recipes already added.");
            return;
          }

          onChange([...selected, ...toAdd]);
          toast.success(
            `Added ${toAdd.length} unused recipe${toAdd.length > 1 ? "s" : ""}.`,
          );
        }}
      >
        Add unused meals from previous plan
      </Button>
      <FormLabel className="mt-4">Rolling recipes</FormLabel>
      <FormControl>
        <MultipleSelector
          value={selected.map((r) => {
            const recipe = recipes.find((rec) => rec.id === r.recipeId);
            return {
              value: r.recipeId,
              label: recipe?.name ?? r.recipeId,
            };
          })}
          onChange={(options) => {
            const updated = options.map((o) => {
              const existing = selected.find((r) => r.recipeId === o.value);
              if (existing) return existing;
              const recipe = recipes.find((r) => r.id === o.value);
              const defaultMeals =
                recipe && recipe.servings > 2
                  ? Math.floor(recipe.servings / 2)
                  : 1;
              return { recipeId: o.value, meals: defaultMeals };
            });
            onChange(updated);
          }}
          defaultOptions={recipes.map((r) => ({
            value: r.id,
            label: r.name,
          }))}
          placeholder="Select recipes"
          emptyIndicator={
            <p className="text-center text-sm text-muted-foreground">
              No recipes found.
            </p>
          }
        />
      </FormControl>
      {selected
        .filter((r) => {
          const recipe = recipes.find((rec) => rec.id === r.recipeId);
          return recipe && recipe.servings > 2;
        })
        .map((r) => {
          const recipe = recipes.find((rec) => rec.id === r.recipeId)!;
          const maxMeals = Math.floor(recipe.servings / 2);
          return (
            <div key={r.recipeId} className="mt-2 flex items-center gap-2">
              <span className="flex-1 truncate text-sm">{recipe.name}</span>
              <Input
                type="number"
                min={1}
                max={maxMeals}
                className="w-20"
                value={r.meals}
                onChange={(e) => {
                  const newMeals = Math.min(
                    Math.max(Number(e.target.value) || 1, 1),
                    maxMeals,
                  );
                  onChange(
                    selected.map((s) =>
                      s.recipeId === r.recipeId
                        ? { ...s, meals: newMeals }
                        : s,
                    ),
                  );
                }}
              />
              <span className="type-body whitespace-nowrap text-muted-foreground">
                meals (max {maxMeals})
              </span>
            </div>
          );
        })}
    </FormItem>
  );
}
