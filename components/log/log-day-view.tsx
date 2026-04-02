"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants";
import { formatDayLabel } from "@/lib/planner/helpers";
import {
  buildGroupedPlannerPoolCards,
  type LogDayData,
  type PlannerPoolCardData,
} from "@/lib/log/view-model";
import { LogSlot } from "./log-slot";
import {
  LogIngredientsForm,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "./log-ingredients-form";
import {
  appendNextLogDayAction,
  clearLogEntryAssignmentAction,
  placePlannerPoolItemAction,
  removeLogDayAction,
  upsertLogSlotAction,
} from "@/actions/log-actions";
import { LogDayHeader } from "./log-day-header";
import { LogDaySelector } from "./log-day-selector";
import { LogPool } from "./log-pool";
import { LogRemoveDayAlertDialog } from "./log-remove-day-alert-dialog";

type SelectedSlotState = {
  dayKey: string;
  mealType: LogDayData["slots"][number]["mealType"];
  entryId: string;
  entryRecipeId: string | null;
  mealLabel: string;
  selectedRecipeId: string | null;
  initialSelectedRecipeId: string | null;
  subtitle: string;
  initialRows: EditableIngredientRow[];
};

type IngredientFormDependencies = {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; namePlural: string | null }>;
  gramsUnitId: string;
  iconOptions: string[];
};

function toRecipeMacros(
  rows: EditableIngredientRow[],
  ingredientOptions: LogIngredientOption[],
) {
  let calories = 0;
  let proteins = 0;
  let fats = 0;
  let carbs = 0;

  const ingredientById = new Map(
    ingredientOptions.map((item) => [item.id, item]),
  );

  for (const row of rows) {
    if (row.amount == null || !row.ingredientId || !row.unitId) {
      continue;
    }

    const ingredient = ingredientById.get(row.ingredientId);
    if (!ingredient) {
      continue;
    }

    const conversion = ingredient.unitConversions.find(
      (item) => item.unitId === row.unitId,
    );
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
  const ingredientById = new Map(
    ingredientOptions.map((item) => [item.id, item]),
  );

  return rows.map((row) => {
    const ingredient = row.ingredientId
      ? ingredientById.get(row.ingredientId)
      : null;
    const unit = ingredient?.unitConversions.find(
      (item) => item.unitId === row.unitId,
    );

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
  plannerPool?: PlannerPoolCardData[];
  initialSelectedDayKey?: string;
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

type RemoveDayWarningState = {
  dateKey: string;
  impactedLogMealsCount: number;
  impactedPlanMealsCount: number;
};

export function LogDayView({
  days,
  plannerPool = [],
  initialSelectedDayKey,
  logId,
  person,
  recipeOptions = [],
  ingredientOptions = [],
}: LogDayViewProps) {
  const router = useRouter();
  const defaultDayKey =
    initialSelectedDayKey &&
    days.some((day) => day.dateKey === initialSelectedDayKey)
      ? initialSelectedDayKey
      : (days[0]?.dateKey ?? null);
  const [localDays, setLocalDays] = useState(days);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    defaultDayKey,
  );
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlotState | null>(
    null,
  );
  const [removeDayWarning, setRemoveDayWarning] =
    useState<RemoveDayWarningState | null>(null);
  const [isSaving, startSavingTransition] = useTransition();
  const [isAddingDay, startAddDayTransition] = useTransition();
  const [isRemovingDay, startRemoveDayTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  // Pool list comes from the server only (unused plan slots + buildVisiblePlannerPoolCards).

  const groupedPlannerPool = buildGroupedPlannerPoolCards(plannerPool);

  useEffect(() => {
    setLocalDays(days);
  }, [days]);

  useEffect(() => {
    if (!selectedDayKey || days.length === 0) {
      setSelectedDayKey(days[0]?.dateKey ?? null);
      return;
    }

    const stillExists = days.some((day) => day.dateKey === selectedDayKey);
    if (!stillExists) {
      setSelectedDayKey(days[0]?.dateKey ?? null);
      setSelectedSlot(null);
    }
  }, [days, selectedDayKey]);

  useEffect(() => {
    if (!selectedDayKey) {
      return;
    }

    if (selectedSlot?.dayKey === selectedDayKey) {
      return;
    }

    const activeDay = days.find((day) => day.dateKey === selectedDayKey);
    if (!activeDay) {
      return;
    }

    for (const slot of activeDay.slots) {
      if (!slot.entryId) {
        continue;
      }

      const firstRecipe = slot.recipes[0];
      setSelectedSlot({
        dayKey: activeDay.dateKey,
        mealType: slot.mealType,
        entryId: slot.entryId,
        entryRecipeId: firstRecipe?.entryRecipeId ?? null,
        mealLabel: slot.label,
        selectedRecipeId: firstRecipe?.sourceRecipeId ?? null,
        initialSelectedRecipeId: firstRecipe?.sourceRecipeId ?? null,
        subtitle: `${formatDayLabel(activeDay.date)}`,
        initialRows:
          firstRecipe?.ingredients?.map((ingredient) => ({
            ingredientId: ingredient.ingredientId,
            unitId: ingredient.unitId,
            amount: ingredient.amount,
          })) ?? [],
      });
      return;
    }
  }, [days, selectedDayKey, selectedSlot]);

  const selectEmptySlot = (
    day: LogDayData,
    slot: LogDayData["slots"][number],
  ) => {
    if (!slot.entryId) {
      toast.error("Cannot edit this slot yet");
      return;
    }

    setSelectedSlot({
      dayKey: day.dateKey,
      mealType: slot.mealType,
      entryId: slot.entryId,
      entryRecipeId: null,
      mealLabel: slot.label,
      selectedRecipeId: null,
      initialSelectedRecipeId: null,
      subtitle: `${formatDayLabel(day.date)}`,
      initialRows: [],
    });
  };

  const selectRecipeSlot = (
    day: LogDayData,
    slot: LogDayData["slots"][number],
    recipe: LogDayData["slots"][number]["recipes"][number],
  ) => {
    if (!recipe.entryId) {
      toast.error("Cannot edit this recipe yet");
      return;
    }

    setSelectedSlot({
      dayKey: day.dateKey,
      mealType: slot.mealType,
      entryId: recipe.entryId,
      entryRecipeId: recipe.entryRecipeId,
      mealLabel: slot.label,
      selectedRecipeId: recipe.sourceRecipeId,
      initialSelectedRecipeId: recipe.sourceRecipeId,
      subtitle: `${formatDayLabel(day.date)}`,
      initialRows:
        recipe.ingredients?.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          unitId: ingredient.unitId,
          amount: ingredient.amount,
        })) ?? [],
    });
  };

  const handleSelectedRecipeChange = (nextRecipeId: string | null) => {
    setSelectedSlot((prev) => {
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
  };

  const handleSlotSave = async (rows: EditableIngredientRow[]) => {
    if (!logId || !person || !selectedSlot) {
      toast.error("Missing log context for this action");
      return;
    }

    // Snapshot selection at submit-time so async save uses stable identifiers.
    const activeSelection = selectedSlot;
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
        entryId: activeSelection.entryId,
        recipeId: activeSelection.selectedRecipeId,
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
          (recipeOption) =>
            recipeOption.id === activeSelection.selectedRecipeId,
        );

        return prev.map((mappedDay) => ({
          ...mappedDay,
          slots: mappedDay.slots.map((mappedSlot) => {
            if (mappedSlot.entryId !== activeSelection.entryId) {
              return mappedSlot;
            }

            const existingIndex = mappedSlot.recipes.findIndex(
              (recipe) => recipe.entryId === activeSelection.entryId,
            );
            const existingRecipe =
              existingIndex >= 0 ? mappedSlot.recipes[existingIndex] : null;

            const nextRecipeCard = {
              ...(existingRecipe ?? {
                id: `temp-${activeSelection.entryId}`,
                entryId: activeSelection.entryId,
                entryRecipeId: null,
                sourceRecipeId: null,
                mealLabel: mappedSlot.label,
                cardKind: "custom" as const,
                title: `Custom ${mappedSlot.label.toLowerCase()}`,
                slug: null,
                imageUrl: null,
                calories: 0,
                proteins: 0,
                fats: 0,
                carbs: 0,
                ingredients: [],
              }),
              id:
                activeSelection.selectedRecipeId == null
                  ? `custom-${activeSelection.entryId}`
                  : (existingRecipe?.id ?? `temp-${activeSelection.entryId}`),
              entryRecipeId:
                activeSelection.selectedRecipeId == null
                  ? null
                  : (existingRecipe?.entryRecipeId ??
                    activeSelection.entryRecipeId),
              sourceRecipeId: activeSelection.selectedRecipeId,
              cardKind:
                activeSelection.selectedRecipeId == null
                  ? ("custom" as const)
                  : ("recipe" as const),
              title:
                activeSelection.selectedRecipeId == null
                  ? `Custom ${mappedSlot.label.toLowerCase()}`
                  : (selectedRecipeOption?.name ??
                    existingRecipe?.title ??
                    `Custom ${mappedSlot.label.toLowerCase()}`),
              slug: null,
              imageUrl: null,
              ...nextMacros,
              ingredients: nextIngredients,
            };

            const nextRecipes = [...mappedSlot.recipes];
            if (
              activeSelection.selectedRecipeId == null &&
              nextIngredients.length === 0
            ) {
              if (existingIndex >= 0) {
                nextRecipes.splice(existingIndex, 1);
              }
            } else if (existingIndex >= 0) {
              nextRecipes[existingIndex] = nextRecipeCard;
            } else {
              nextRecipes.unshift(nextRecipeCard);
            }

            return {
              ...mappedSlot,
              recipes: nextRecipes,
            };
          }),
        }));
      });

      // Keep the inline form in sync after successful save.
      setSelectedSlot((prev) =>
        prev == null
          ? prev
          : {
              ...prev,
              initialRows: rows,
              initialSelectedRecipeId: activeSelection.selectedRecipeId,
            },
      );
      toast.success("Ingredients updated");
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current;
    const overData = event.over?.data.current;
    if (!activeData || !overData) return;
    if (activeData.type !== "planner-pool-item" || overData.type !== "log-slot")
      return;

    if (!logId || !person || !overData.entryId) {
      toast.error("Missing log context for this action");
      return;
    }

    const plannerItem = activeData.item as PlannerPoolCardData;
    const targetEntryId = overData.entryId as string;

    startSavingTransition(async () => {
      const result = await placePlannerPoolItemAction({
        logId,
        person,
        entryId: targetEntryId,
        sourceRecipeId: plannerItem.sourceRecipeId ?? "",
        ingredients: plannerItem.ingredients,
      });

      if (result.type === "error") {
        toast.error(result.message);
        return;
      }

      setLocalDays((prev) =>
        prev.map((day) => ({
          ...day,
          slots: day.slots.map((slot) => {
            if (slot.entryId !== targetEntryId) return slot;
            return {
              ...slot,
              recipes: [
                {
                  id: `placed-${targetEntryId}-${plannerItem.id}`,
                  entryId: targetEntryId,
                  entryRecipeId: null,
                  sourceRecipeId: plannerItem.sourceRecipeId,
                  mealLabel: slot.label,
                  cardKind: "recipe",
                  title: plannerItem.title,
                  slug: null,
                  imageUrl: plannerItem.imageUrl,
                  calories: 0,
                  proteins: 0,
                  fats: 0,
                  carbs: 0,
                  ingredients: plannerItem.ingredients.map((ingredient) => ({
                    ingredientId: ingredient.ingredientId,
                    ingredientName: null,
                    unitId: ingredient.unitId,
                    unitName: null,
                    amount: ingredient.amount,
                  })),
                },
              ],
            };
          }),
        })),
      );

      const targetDayKey = (overData.dateKey as string) ?? null;
      const targetMealType =
        (overData.mealType as
          | LogDayData["slots"][number]["mealType"]
          | undefined) ?? null;
      const targetDay =
        localDays.find((day) => day.dateKey === targetDayKey) ?? null;
      const targetSlot =
        targetDay?.slots.find((slot) => slot.mealType === targetMealType) ??
        null;

      if (targetDay && targetSlot?.entryId) {
        const initialRows = plannerItem.ingredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          unitId: ingredient.unitId,
          amount: ingredient.amount,
        }));

        // Auto-open details for the just-dropped recipe so ingredients are immediately editable.
        setSelectedDayKey(targetDay.dateKey);
        setSelectedSlot({
          dayKey: targetDay.dateKey,
          mealType: targetSlot.mealType,
          entryId: targetSlot.entryId,
          entryRecipeId: null,
          mealLabel: targetSlot.label,
          selectedRecipeId: plannerItem.sourceRecipeId,
          initialSelectedRecipeId: plannerItem.sourceRecipeId,
          subtitle: `${formatDayLabel(targetDay.date)}`,
          initialRows,
        });
      }

      router.refresh();
    });
  };

  const handleRemovePlacedRecipe = async (
    slot: LogDayData["slots"][number],
  ) => {
    if (!logId || !person || !slot.entryId) {
      toast.error("Missing log context for this action");
      return;
    }

    startSavingTransition(async () => {
      const result = await clearLogEntryAssignmentAction({
        logId,
        person,
        entryId: slot.entryId!,
      });

      if (result.type === "error") {
        toast.error(result.message);
        return;
      }

      setLocalDays((prev) =>
        prev.map((day) => ({
          ...day,
          slots: day.slots.map((s) =>
            s.entryId === slot.entryId ? { ...s, recipes: [] } : s,
          ),
        })),
      );

      setSelectedSlot((prev) => (prev?.entryId === slot.entryId ? null : prev));

      router.refresh();
    });
  };

  if (days.length === 0) {
    return (
      <section className="rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-medium">
          No log entries for selected person
        </h2>
        <p className="text-sm text-muted-foreground">
          Switch person or create a plan to generate baseline log entries.
        </p>
      </section>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <section className="mt-8 space-y-8">
        <LogRemoveDayAlertDialog
          open={removeDayWarning != null}
          warning={
            removeDayWarning
              ? {
                  impactedLogMealsCount: removeDayWarning.impactedLogMealsCount,
                  impactedPlanMealsCount:
                    removeDayWarning.impactedPlanMealsCount,
                }
              : null
          }
          onOpenChange={(open) => {
            if (!open) setRemoveDayWarning(null);
          }}
          onConfirm={() => {
            if (!removeDayWarning || !logId) {
              return;
            }

            const warningSnapshot = removeDayWarning;
            startRemoveDayTransition(async () => {
              const forcedResult = await removeLogDayAction({
                logId,
                dateKey: warningSnapshot.dateKey,
                force: true,
              });
              if (forcedResult.type === "error") {
                toast.error(forcedResult.message);
                return;
              }

              const nextPerson = person ?? "PRIMARY";
              if (forcedResult.type === "success" && forcedResult.nextDayKey) {
                router.push(
                  `${ROUTES.logView(logId)}?person=${nextPerson}&day=${forcedResult.nextDayKey}`,
                );
              } else {
                router.push(`${ROUTES.logView(logId)}?person=${nextPerson}`);
              }

              setRemoveDayWarning(null);
              router.refresh();
            });
          }}
        />
        {/* Keep the current stacking order on smaller screens. */}
        <div className="lg:hidden">
          <LogPool items={groupedPlannerPool} />
        </div>
        <LogDaySelector
          days={localDays}
          selectedDayKey={selectedDayKey}
          onSelectDay={(dateKey) => {
            setSelectedDayKey(dateKey);
            setSelectedSlot(null);
          }}
          logId={logId}
          isAddingDay={isAddingDay}
          onAddDay={() => {
            if (!logId) {
              return;
            }
            startAddDayTransition(async () => {
              const result = await appendNextLogDayAction({ logId });
              if (result.type === "date_conflict") {
                // Keep collision feedback explicit: hard-block without destructive override.
                toast.error(
                  `Cannot add day. Date conflict: ${result.dates.join(", ")}`,
                );
                return;
              }
              if (result.type === "error") {
                toast.error(result.message);
                return;
              }
              const nextPerson = person ?? "PRIMARY";
              const nextUrl = `${ROUTES.logView(logId)}?person=${nextPerson}&day=${result.dateKey}`;
              router.push(nextUrl);
              router.refresh();
            });
          }}
        />
        {localDays
          .filter((day) => day.dateKey === selectedDayKey)
          .map((day) => {
            const isActiveDay = selectedSlot?.dayKey === day.dateKey;
            return (
              <article key={day.dateKey} className="space-y-4">
                <LogDayHeader
                  day={day}
                  logId={logId}
                  isRemovingDay={isRemovingDay}
                  onRemoveDay={() => {
                    if (!logId) {
                      return;
                    }
                    startRemoveDayTransition(async () => {
                      const result = await removeLogDayAction({
                        logId,
                        dateKey: day.dateKey,
                      });
                      if (result.type === "impact_warning") {
                        setRemoveDayWarning({
                          dateKey: day.dateKey,
                          impactedLogMealsCount: result.impactedLogMealsCount,
                          impactedPlanMealsCount: result.impactedPlanMealsCount,
                        });
                        return;
                      }
                      if (result.type === "error") {
                        toast.error(result.message);
                        return;
                      }
                      const nextPerson = person ?? "PRIMARY";
                      if (result.nextDayKey) {
                        const nextUrl = `${ROUTES.logView(logId)}?person=${nextPerson}&day=${result.nextDayKey}`;
                        router.push(nextUrl);
                      } else {
                        router.push(
                          `${ROUTES.logView(logId)}?person=${nextPerson}`,
                        );
                      }
                      router.refresh();
                    });
                  }}
                />
                {/* Desktop: 3 columns (slots/editor/pool) with fixed spans. */}
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-8 lg:gap-4 lg:items-stretch">
                  {/* Pool: span 2 columns */}
                  <div className="hidden lg:block lg:col-span-2 lg:min-h-0">
                    <LogPool items={groupedPlannerPool} />
                  </div>

                  {/* Slots: span 2 columns */}
                  <div className="lg:col-span-2">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      {day.slots.map((slot) => (
                        <LogSlot
                          key={`${day.dateKey}-${slot.mealType}`}
                          dayKey={day.dateKey}
                          slot={slot}
                          onEmptyClick={() => selectEmptySlot(day, slot)}
                          onRecipeClick={(recipe) =>
                            selectRecipeSlot(day, slot, recipe)
                          }
                          onRecipeRemove={() => handleRemovePlacedRecipe(slot)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Editor: span 4 columns */}
                  <div
                    className={
                      isActiveDay
                        ? "lg:col-span-4 min-h-0"
                        : "hidden lg:block lg:col-span-4 lg:min-h-0"
                    }
                  >
                    {isActiveDay ? (
                      <LogIngredientsForm
                        title={selectedSlot.mealLabel}
                        subtitle={selectedSlot.subtitle}
                        initialRows={selectedSlot.initialRows}
                        ingredientOptions={ingredientOptions}
                        isSaving={isSaving}
                        recipeOptions={recipeOptions}
                        selectedRecipeId={selectedSlot.selectedRecipeId}
                        initialSelectedRecipeId={
                          selectedSlot.initialSelectedRecipeId
                        }
                        onSelectedRecipeIdChange={handleSelectedRecipeChange}
                        onSave={handleSlotSave}
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
      </section>
    </DndContext>
  );
}
