"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type {
  PlannerCriteriaInputType,
  RollingRecipeType,
} from "@/lib/validations/planner";
import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";
import MultipleSelector from "@/components/ui/multiselect";
import type { Control } from "react-hook-form";

type PlannerRollingRecipesSectionProps = {
  control: Control<PlannerCriteriaInputType>;
  selected: RollingRecipeType[];
  onChange: (next: RollingRecipeType[]) => void;
  ingredients: IngredientType[];
  recipes: RecipeType[];
  previousPlanUnusedRecipes: RollingRecipeType[];
  onInvalidStateChange?: (hasInvalid: boolean) => void;
};

export function PlannerRollingRecipesSection({
  control,
  selected,
  onChange,
  ingredients,
  recipes,
  previousPlanUnusedRecipes,
  onInvalidStateChange,
}: PlannerRollingRecipesSectionProps) {
  const [mealsDraft, setMealsDraft] = useState<Record<string, string>>({});
  const [blurredRecipeIds, setBlurredRecipeIds] = useState<Record<string, true>>({});

  const hasInvalid = useMemo(
    () =>
      selected.some((entry) => {
        const draft = mealsDraft[entry.recipeId] ?? String(entry.meals);
        if (draft.trim() === "") return true;
        const parsed = Number(draft);
        return !Number.isInteger(parsed) || parsed < 1;
      }),
    [mealsDraft, selected],
  );

  useEffect(() => {
    onInvalidStateChange?.(hasInvalid);
  }, [hasInvalid, onInvalidStateChange]);

  const inputErrorClass =
    "border-destructive focus-visible:ring-destructive/30 focus-visible:border-destructive";

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
                value={mealsDraft[r.recipeId] ?? String(r.meals)}
                onBlur={() =>
                  setBlurredRecipeIds((prev) => ({ ...prev, [r.recipeId]: true }))
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  setMealsDraft((prev) => ({ ...prev, [r.recipeId]: raw }));
                  if (raw === "" || !/^-?\d+$/.test(raw)) return;
                  const newMeals = Number(raw);
                  onChange(
                    selected.map((s) =>
                      s.recipeId === r.recipeId
                        ? { ...s, meals: newMeals }
                        : s,
                    ),
                  );
                }}
                // Red only after blur for invalid values; keep value untouched.
                className={
                  blurredRecipeIds[r.recipeId] &&
                  (() => {
                    const draft = mealsDraft[r.recipeId] ?? String(r.meals);
                    if (draft.trim() === "") return true;
                    const parsed = Number(draft);
                    return !Number.isInteger(parsed) || parsed < 1;
                  })()
                    ? `w-20 ${inputErrorClass}`
                    : "w-20"
                }
              />
              <span className="type-body whitespace-nowrap text-muted-foreground">
                meals
              </span>
            </div>
          );
        })}
      <FormField
        control={control}
        name="fridgeIngredientIds"
        render={({ field }) => (
          <FormItem className="mt-4">
            <FormLabel>Fridge ingredients</FormLabel>
            <FormControl>
              <MultipleSelector
                value={ingredients
                  .filter((ing) =>
                    (field.value as string[])?.includes(ing.id),
                  )
                  .map((ing) => ({ value: ing.id, label: ing.name }))}
                onChange={(options) =>
                  field.onChange(options.map((o) => o.value))
                }
                defaultOptions={ingredients.map((ing) => ({
                  value: ing.id,
                  label: ing.name,
                }))}
                placeholder="Select ingredients"
                emptyIndicator={
                  <p className="text-center text-sm text-muted-foreground">
                    No ingredients found.
                  </p>
                }
              />
            </FormControl>
          </FormItem>
        )}
      />
    </FormItem>
  );
}
