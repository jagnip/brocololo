"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getPlannerMealCount } from "@/lib/planner/helpers";

type PlannerRollingRecipesSectionProps = {
  control: Control<PlannerCriteriaInputType>;
  selected: RollingRecipeType[];
  onChange: (next: RollingRecipeType[]) => void;
  ingredients: IngredientType[];
  recipes: RecipeType[];
  onInvalidStateChange?: (hasInvalid: boolean) => void;
};

export function PlannerRollingRecipesSection({
  control,
  selected,
  onChange,
  ingredients,
  recipes,
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
    <FormItem className="min-w-0 w-full">
      <FormLabel>Rolling recipes</FormLabel>
      <FormControl>
        <MultipleSelector
          className="w-full min-w-0"
          value={selected.map((r) => {
            const recipe = recipes.find((rec) => rec.id === r.recipeId);
            return {
              value: r.recipeId,
              label: recipe?.name ?? r.recipeId,
            };
          })}
           onChange={(options) => {
             const selectedIds = new Set(options.map((option) => option.value));
             setMealsDraft((current) => Object.fromEntries(
               Object.entries(current).filter(([id]) => selectedIds.has(id)),
             ));
             setBlurredRecipeIds((current) => Object.fromEntries(
               Object.entries(current).filter(([id]) => selectedIds.has(id)),
             ));
            const updated = options.map((o) => {
              const existing = selected.find((r) => r.recipeId === o.value);
              if (existing) return existing;
              const recipe = recipes.find((r) => r.id === o.value);
              // Default override meals from the recipe's explicit plannedMealCount.
              const defaultMeals = recipe ? getPlannerMealCount(recipe) : 1;
               return { recipeId: o.value, meals: defaultMeals, alreadyCooked: false };
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
      <div className="divide-y divide-border">
      {selected
        .filter((r) => {
          const recipe = recipes.find((rec) => rec.id === r.recipeId);
           return recipe != null;
        })
        .map((r) => {
          const recipe = recipes.find((rec) => rec.id === r.recipeId)!;
          return (
            <div key={r.recipeId} className="space-y-2 py-3">
              <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{recipe.name}</span>
              <Input
                type="number"
                 min={1}
                 aria-label={`Rolling meals for ${recipe.name}`}
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
              {recipe.isBatchRecipe ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    aria-label={`Already cooked ${recipe.name}`}
                    checked={r.alreadyCooked ?? false}
                    onCheckedChange={(checked) => onChange(selected.map((entry) =>
                      entry.recipeId === r.recipeId
                        ? { ...entry, alreadyCooked: checked === true }
                        : entry,
                    ))}
                  />
                  Already cooked
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
      <FormField
        control={control}
        name="fridgeIngredientIds"
        render={({ field }) => (
          <FormItem className="mt-4 min-w-0 w-full">
            <FormLabel>Fridge ingredients</FormLabel>
            <FormControl>
              <MultipleSelector
                className="w-full min-w-0"
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
