"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type {
  PlannerCriteriaInputType,
  RollingMealType,
} from "@/lib/validations/planner";
import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";
import MultipleSelector from "@/components/ui/multiselect";
import type { Control } from "react-hook-form";
import { getPlannerMealCount } from "@/lib/planner/helpers";
import { getRollingCustomMealKey } from "@/lib/planner/custom-meal-identity";

function rollingMealOptionKey(entry: RollingMealType): string {
  return entry.kind === "custom"
    ? `custom:${getRollingCustomMealKey(entry.mealType, entry.customMeal)}`
    : `recipe:${entry.recipeId}`;
}

function rollingMealLabel(entry: RollingMealType, recipes: RecipeType[]): string {
  if (entry.kind === "custom") {
    return `${entry.customMeal.name} · Custom ${entry.mealType.toLowerCase()}`;
  }
  return recipes.find((recipe) => recipe.id === entry.recipeId)?.name ?? entry.recipeId;
}

type PlannerRollingRecipesSectionProps = {
  control: Control<PlannerCriteriaInputType>;
  selected: RollingMealType[];
  onChange: (next: RollingMealType[]) => void;
  availableCustomMeals?: Extract<RollingMealType, { kind: "custom" }>[];
  ingredients: IngredientType[];
  recipes: RecipeType[];
  onInvalidStateChange?: (hasInvalid: boolean) => void;
};

export function PlannerRollingRecipesSection({
  control,
  selected,
  onChange,
  availableCustomMeals = [],
  ingredients,
  recipes,
  onInvalidStateChange,
}: PlannerRollingRecipesSectionProps) {
  const [mealsDraft, setMealsDraft] = useState<Record<string, string>>({});
  const [blurredRecipeIds, setBlurredRecipeIds] = useState<Record<string, true>>({});

  const hasInvalid = useMemo(
    () =>
      selected.some((entry) => {
        const draft = mealsDraft[rollingMealOptionKey(entry)] ?? String(entry.meals);
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
      <FormLabel>Rolling meals</FormLabel>
      <FormControl>
        <MultipleSelector
          className="w-full min-w-0"
          value={selected.map((entry) => ({
            value: rollingMealOptionKey(entry),
            label: rollingMealLabel(entry, recipes),
          }))}
          onChange={(options) => {
              const selectedIds = new Set(options.map((option) => option.value));
              setMealsDraft((current) => Object.fromEntries(
                Object.entries(current).filter(([id]) => selectedIds.has(id)),
             ));
             setBlurredRecipeIds((current) => Object.fromEntries(
               Object.entries(current).filter(([id]) => selectedIds.has(id)),
             ));
             const updated = options.flatMap((option) => {
               const existing = selected.find((entry) => rollingMealOptionKey(entry) === option.value);
               if (existing) return existing;
               const recipeId = option.value.startsWith("recipe:")
                 ? option.value.slice("recipe:".length)
                 : option.value.startsWith("custom:") ? null : option.value;
               const recipe = recipeId ? recipes.find((entry) => entry.id === recipeId) : null;
               // Default override meals from the recipe's explicit plannedMealCount.
               if (recipe) return { kind: "recipe" as const, recipeId: recipe.id, meals: getPlannerMealCount(recipe), alreadyCooked: false };
               return availableCustomMeals.filter((entry) => rollingMealOptionKey(entry) === option.value);
             });
             onChange(updated);
           }}
          defaultOptions={[
            ...recipes.map((recipe) => ({
             value: `recipe:${recipe.id}`,
             label: recipe.name,
            })),
            ...availableCustomMeals.map((entry) => ({
              value: rollingMealOptionKey(entry),
              label: rollingMealLabel(entry, recipes),
            })),
          ]}
          placeholder="Select meals"
          emptyIndicator={
            <p className="text-center text-sm text-muted-foreground">
               No meals found.
            </p>
          }
        />
      </FormControl>
      <div className="divide-y divide-border">
      {selected
        .map((entry) => {
           const key = rollingMealOptionKey(entry);
           const recipe = entry.kind !== "custom" ? recipes.find((candidate) => candidate.id === entry.recipeId) : null;
           const label = rollingMealLabel(entry, recipes);
           if (entry.kind !== "custom" && !recipe) return null;
           return (
            <div key={key} className="space-y-2 py-3">
               <div className="flex min-w-0 items-center gap-2">
               <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
              <Input
                type="number"
                 min={1}
                  aria-label={`Rolling meals for ${label}`}
                 value={mealsDraft[key] ?? String(entry.meals)}
                onBlur={() =>
                   setBlurredRecipeIds((prev) => ({ ...prev, [key]: true }))
                }
                onChange={(e) => {
                  const raw = e.target.value;
                   setMealsDraft((prev) => ({ ...prev, [key]: raw }));
                  if (raw === "" || !/^-?\d+$/.test(raw)) return;
                  const newMeals = Number(raw);
                  onChange(
                    selected.map((s) =>
                       rollingMealOptionKey(s) === key
                        ? { ...s, meals: newMeals }
                        : s,
                    ),
                  );
                }}
                // Red only after blur for invalid values; keep value untouched.
                className={
                   blurredRecipeIds[key] &&
                  (() => {
                     const draft = mealsDraft[key] ?? String(entry.meals);
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
               {entry.kind !== "custom" && recipe?.isBatchRecipe ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                     aria-label={`Already cooked ${recipe.name}`}
                     checked={entry.alreadyCooked ?? false}
                    onCheckedChange={(checked) => onChange(selected.map((entry) =>
                       rollingMealOptionKey(entry) === key
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
