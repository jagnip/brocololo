"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDayLabel } from "@/lib/planner/helpers";
import type { LogDayData } from "@/lib/log/view-model";
import { LogSlotCard } from "./log-slot-card";
import {
  EditLogIngredientsDialog,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "./edit-log-ingredients-dialog";
import { upsertLogSlotAction } from "@/actions/log-actions";

type SelectedRecipeState = {
  entryId: string;
  entryRecipeId: string | null;
  mealLabel: string;
  selectedRecipeId: string | null;
  subtitle: string;
  initialRows: EditableIngredientRow[];
};

type IngredientFormDependencies = {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; namePlural: string | null }>;
  gramsUnitId: string;
  iconOptions: string[];
};

function toDayMacros(day: LogDayData) {
  // Aggregate all rendered slot recipes into a daily macro summary.
  return day.slots.reduce(
    (totals, slot) => {
      for (const recipe of slot.recipes) {
        totals.calories += recipe.calories;
        totals.proteins += recipe.proteins;
        totals.fats += recipe.fats;
        totals.carbs += recipe.carbs;
      }
      return totals;
    },
    { calories: 0, proteins: 0, fats: 0, carbs: 0 },
  );
}

function toRecipeMacros(
  rows: EditableIngredientRow[],
  ingredientOptions: LogIngredientOption[],
) {
  let calories = 0;
  let proteins = 0;
  let fats = 0;
  let carbs = 0;

  const ingredientById = new Map(ingredientOptions.map((item) => [item.id, item]));

  for (const row of rows) {
    if (row.amount == null || !row.ingredientId || !row.unitId) {
      continue;
    }

    const ingredient = ingredientById.get(row.ingredientId);
    if (!ingredient) {
      continue;
    }

    const conversion = ingredient.unitConversions.find((item) => item.unitId === row.unitId);
    if (!conversion) {
      continue;
    }

    const grams = row.amount * conversion.gramsPerUnit;
    const nutrientMultiplier = grams / 100;
    calories += ingredient.calories * nutrientMultiplier;
    proteins += ingredient.proteins * nutrientMultiplier;
    fats += ingredient.fats * nutrientMultiplier;
    carbs += ingredient.carbs * nutrientMultiplier;
  }

  const round1 = (value: number) => Math.round(value * 10) / 10;
  return {
    calories: round1(calories),
    proteins: round1(proteins),
    fats: round1(fats),
    carbs: round1(carbs),
  };
}

function toRecipeIngredients(
  rows: EditableIngredientRow[],
  ingredientOptions: LogIngredientOption[],
) {
  const ingredientById = new Map(ingredientOptions.map((item) => [item.id, item]));

  return rows.map((row) => {
    const ingredient = row.ingredientId ? ingredientById.get(row.ingredientId) : null;
    const unit = ingredient?.unitConversions.find((item) => item.unitId === row.unitId);

    return {
      ingredientId: row.ingredientId,
      ingredientName: ingredient?.name ?? null,
      unitId: row.unitId,
      unitName: unit?.unitName ?? null,
      amount: row.amount,
    };
  });
}

type LogDayViewProps = {
  days: LogDayData[];
  logId?: string;
  person?: "PRIMARY" | "SECONDARY";
  recipeOptions?: Array<{
    id: string;
    name: string;
    initialRows: EditableIngredientRow[];
  }>;
  ingredientOptions?: LogIngredientOption[];
  ingredientFormDependencies?: IngredientFormDependencies;
};

export function LogDayView({
  days,
  logId,
  person,
  recipeOptions = [],
  ingredientOptions = [],
  ingredientFormDependencies,
}: LogDayViewProps) {
  const [localDays, setLocalDays] = useState(days);
  const [selectedRecipe, setSelectedRecipe] = useState<SelectedRecipeState | null>(null);
  const [isSaving, startSavingTransition] = useTransition();

  useEffect(() => {
    setLocalDays(days);
  }, [days]);

  if (days.length === 0) {
    return (
      <section className="rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-medium">No log entries for selected person</h2>
        <p className="text-sm text-muted-foreground">
          Switch person or create a plan to generate baseline log entries.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-8">
      {localDays.map((day) => {
        const dayMacros = toDayMacros(day);
        return (
          <article key={day.dateKey} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-medium">{formatDayLabel(day.date)}</h2>
              <Badge variant="outline">{dayMacros.calories.toFixed(0)} kcal</Badge>
              <Badge variant="outline">{dayMacros.proteins.toFixed(1)}g protein</Badge>
              <Badge variant="outline">{dayMacros.fats.toFixed(1)}g fat</Badge>
              <Badge variant="outline">{dayMacros.carbs.toFixed(1)}g carbs</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {day.slots.map((slot) => (
                <div key={`${day.dateKey}-${slot.mealType}`} className="space-y-2">
                  <p className="text-sm text-muted-foreground">{slot.label}</p>
                  <LogSlotCard
                    slot={slot}
                    onEmptyClick={() => {
                      if (!slot.entryId) {
                        toast.error("Cannot edit this slot yet");
                        return;
                      }

                      setSelectedRecipe({
                        entryId: slot.entryId,
                        entryRecipeId: null,
                        mealLabel: slot.label,
                        selectedRecipeId: null,
                        subtitle: `${formatDayLabel(day.date)}`,
                        initialRows: [],
                      });
                    }}
                    onRecipeClick={(recipe) => {
                      if (!recipe.entryId) {
                        toast.error("Cannot edit this recipe yet");
                        return;
                      }

                      setSelectedRecipe({
                        entryId: recipe.entryId,
                        entryRecipeId: recipe.entryRecipeId,
                        mealLabel: slot.label,
                        selectedRecipeId: recipe.sourceRecipeId,
                        subtitle: `${formatDayLabel(day.date)}`,
                        initialRows:
                          recipe.ingredients?.map((ingredient) => ({
                            ingredientId: ingredient.ingredientId,
                            unitId: ingredient.unitId,
                            amount: ingredient.amount,
                          })) ?? [],
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </article>
        );
      })}

      {selectedRecipe ? (
        <EditLogIngredientsDialog
          open
          title={selectedRecipe.mealLabel}
          subtitle={selectedRecipe.subtitle}
          initialRows={selectedRecipe.initialRows}
          ingredientOptions={ingredientOptions}
          ingredientFormDependencies={ingredientFormDependencies}
          isSaving={isSaving}
          contextControls={
            <div className="space-y-2">
              <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
                Recipe (optional)
              </p>
              <SearchableSelect
                options={recipeOptions.map((recipe) => ({
                  value: recipe.id,
                  label: recipe.name,
                }))}
                value={selectedRecipe.selectedRecipeId}
                onValueChange={(nextRecipeId) => {
                  setSelectedRecipe((prev) => {
                    if (!prev) {
                      return prev;
                    }

                    if (!nextRecipeId) {
                      return {
                        ...prev,
                        selectedRecipeId: null,
                        initialRows: [],
                      };
                    }

                    const selectedOption = recipeOptions.find(
                      (recipeOption) => recipeOption.id === nextRecipeId,
                    );

                    return {
                      ...prev,
                      selectedRecipeId: nextRecipeId,
                      initialRows: selectedOption?.initialRows ?? [],
                    };
                  });
                }}
                placeholder="Select a recipe..."
                searchPlaceholder="Search recipe..."
                emptyLabel="No recipe found."
                allowClear
                clearLabel="Clear recipe"
              />
              <p className="text-xs text-muted-foreground">
                Clearing recipe removes current ingredients for this person.
              </p>
            </div>
          }
          onOpenChange={(open) => {
            if (!open) {
              setSelectedRecipe(null);
            }
          }}
          onSave={async (rows) => {
            if (!logId || !person) {
              toast.error("Missing log context for this action");
              return;
            }

            const completeRows = rows.filter(
              (row): row is { ingredientId: string; unitId: string; amount: number } =>
                row.ingredientId != null &&
                row.unitId != null &&
                row.amount != null &&
                row.amount > 0,
            );

            startSavingTransition(async () => {
              const result = await upsertLogSlotAction({
                logId,
                person,
                entryId: selectedRecipe.entryId,
                recipeId: selectedRecipe.selectedRecipeId,
                ingredients: completeRows,
              });

              if (result.type === "error") {
                toast.error(result.message);
                return;
              }

              const nextMacros = toRecipeMacros(rows, ingredientOptions);
              const nextIngredients = toRecipeIngredients(rows, ingredientOptions);

              setLocalDays((prev) => {
                const selectedRecipeOption = recipeOptions.find(
                  (recipeOption) => recipeOption.id === selectedRecipe.selectedRecipeId,
                );

                return prev.map((day) => ({
                  ...day,
                  slots: day.slots.map((slot) => {
                    if (slot.entryId !== selectedRecipe.entryId) {
                      return slot;
                    }

                    const existingIndex = slot.recipes.findIndex(
                      (recipe) => recipe.entryId === selectedRecipe.entryId,
                    );
                    const existingRecipe = existingIndex >= 0 ? slot.recipes[existingIndex] : null;

                    const nextRecipeCard = {
                      ...(existingRecipe ?? {
                        id: `temp-${selectedRecipe.entryId}`,
                        entryId: selectedRecipe.entryId,
                        entryRecipeId: null,
                        sourceRecipeId: null,
                        mealLabel: slot.label,
                        cardKind: "custom" as const,
                        title: `Custom ${slot.label.toLowerCase()}`,
                        slug: null,
                        imageUrl: null,
                        calories: 0,
                        proteins: 0,
                        fats: 0,
                        carbs: 0,
                        ingredients: [],
                      }),
                      id:
                        selectedRecipe.selectedRecipeId == null
                          ? `custom-${selectedRecipe.entryId}`
                          : (existingRecipe?.id ?? `temp-${selectedRecipe.entryId}`),
                      entryRecipeId:
                        selectedRecipe.selectedRecipeId == null
                          ? null
                          : (existingRecipe?.entryRecipeId ?? selectedRecipe.entryRecipeId),
                      sourceRecipeId: selectedRecipe.selectedRecipeId,
                      cardKind:
                        selectedRecipe.selectedRecipeId == null
                          ? ("custom" as const)
                          : ("recipe" as const),
                      title:
                        selectedRecipe.selectedRecipeId == null
                          ? `Custom ${slot.label.toLowerCase()}`
                          : selectedRecipeOption?.name ??
                            existingRecipe?.title ??
                            `Custom ${slot.label.toLowerCase()}`,
                      slug: null,
                      imageUrl: null,
                      ...nextMacros,
                      ingredients: nextIngredients,
                    };

                    const nextRecipes = [...slot.recipes];
                    if (selectedRecipe.selectedRecipeId == null && nextIngredients.length === 0) {
                      if (existingIndex >= 0) {
                        nextRecipes.splice(existingIndex, 1);
                      }
                    } else {
                      if (existingIndex >= 0) {
                        nextRecipes[existingIndex] = nextRecipeCard;
                      } else {
                        nextRecipes.unshift(nextRecipeCard);
                      }
                    }

                    return {
                      ...slot,
                      recipes: nextRecipes,
                    };
                  }),
                }));
              });

              setSelectedRecipe(null);
              toast.success("Ingredients updated");
            });
          }}
        />
      ) : null}
    </section>
  );
}
