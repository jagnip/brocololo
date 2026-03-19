"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDayLabel } from "@/lib/planner/helpers";
import type { LogDayData } from "@/lib/log/view-model";
import { LogSlotCard } from "./log-slot-card";
import {
  EditLogIngredientsDialog,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "./edit-log-ingredients-dialog";
import { updateLogRecipeIngredientsAction } from "@/actions/log-actions";

type SelectedRecipeState = {
  entryId: string;
  entryRecipeId: string;
  title: string;
  subtitle: string;
  initialRows: EditableIngredientRow[];
};

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
  ingredientOptions?: LogIngredientOption[];
};

export function LogDayView({
  days,
  logId,
  person,
  ingredientOptions = [],
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
      {localDays.map((day) => (
        <article key={day.dateKey} className="space-y-4">
          <h2 className="text-base font-medium">{formatDayLabel(day.date)}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {day.slots.map((slot) => (
              <div key={`${day.dateKey}-${slot.mealType}`} className="space-y-2">
                <p className="text-sm text-muted-foreground">{slot.label}</p>
                <LogSlotCard
                  slot={slot}
                  onRecipeClick={(recipe) => {
                    if (!recipe.entryId) {
                      toast.error("Cannot edit this recipe yet");
                      return;
                    }

                    setSelectedRecipe({
                      entryId: recipe.entryId,
                      entryRecipeId: recipe.id,
                      title: recipe.title,
                      subtitle: `${slot.label} • ${formatDayLabel(day.date)}`,
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
      ))}

      {selectedRecipe ? (
        <EditLogIngredientsDialog
          open
          title={selectedRecipe.title}
          subtitle={selectedRecipe.subtitle}
          initialRows={selectedRecipe.initialRows}
          ingredientOptions={ingredientOptions}
          isSaving={isSaving}
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
              const result = await updateLogRecipeIngredientsAction({
                logId,
                person,
                entryId: selectedRecipe.entryId,
                entryRecipeId: selectedRecipe.entryRecipeId,
                ingredients: completeRows,
              });

              if (result.type === "error") {
                toast.error(result.message);
                return;
              }

              const nextMacros = toRecipeMacros(rows, ingredientOptions);
              const nextIngredients = toRecipeIngredients(rows, ingredientOptions);

              setLocalDays((prev) =>
                prev.map((day) => ({
                  ...day,
                  slots: day.slots.map((slot) => ({
                    ...slot,
                    recipes: slot.recipes.map((recipe) => {
                      if (
                        recipe.id !== selectedRecipe.entryRecipeId ||
                        recipe.entryId !== selectedRecipe.entryId
                      ) {
                        return recipe;
                      }

                      return {
                        ...recipe,
                        ...nextMacros,
                        ingredients: nextIngredients,
                      };
                    }),
                  })),
                })),
              );

              setSelectedRecipe(null);
              toast.success("Ingredients updated");
            });
          }}
        />
      ) : null}
    </section>
  );
}
