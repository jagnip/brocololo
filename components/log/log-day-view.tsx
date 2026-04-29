"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { useTopbar } from "@/components/context/topbar-context";
import { ROUTES } from "@/lib/constants";
import { LogMealType } from "@/src/generated/enums";
import { formatDayLabel } from "@/lib/planner/helpers";
import {
  buildGroupedPlannerPoolCards,
  type LogDayData,
  type PlannerPoolCardData,
} from "@/lib/log/view-model";
import {
  type EditableIngredientRow,
  type LogIngredientOption,
} from "./log-ingredients-form";
import {
  appendNextLogDayAction,
  clearLogEntryAssignmentAction,
  duplicateLogEntryAction,
  placePlannerPoolItemAction,
  removeLogDayAction,
  upsertLogSlotAction,
} from "@/actions/log-actions";
import { isLogRecipeCardSelected } from "@/lib/log/is-log-recipe-card-selected";
import {
  LogActiveDayView,
  type SelectedSlotState,
} from "./log-active-day-view";
import { LogRemoveDayAlertDialog } from "./log-remove-day-alert-dialog";
import { LogDuplicateEntryDialog } from "./log-duplicate-entry-dialog";
import type { DateRangeValue } from "@/components/planner/date-range-picker";

type IngredientFormDependencies = {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; namePlural: string | null }>;
  gramsUnitId: string;
  iconOptions: string[];
};

/** Tri-state phone check prevents one-frame desktop fallback on initial mobile render. */
function useIsPhoneViewport() {
  const [isPhone, setIsPhone] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isPhone;
}

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
  dateRange?: DateRangeValue;
  allowDayManagement?: boolean;
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

type DuplicateRecipeState = {
  sourceEntryId: string;
  sourceRecipeId: string | null;
  ingredients: Array<{
    ingredientId: string;
    unitId: string;
    amount: number;
  }>;
};

export function LogDayViewController({
  days,
  plannerPool = [],
  initialSelectedDayKey,
  logId,
  person,
  dateRange,
  allowDayManagement = true,
  recipeOptions = [],
  ingredientOptions = [],
}: LogDayViewProps) {
  const router = useRouter();
  const { isLogFilterPending } = useTopbar();
  const isPhoneViewport = useIsPhoneViewport();
  const initialVisibleDays = days.filter((day) => {
    if (!dateRange) return true;
    return day.dateKey >= dateRange.start && day.dateKey <= dateRange.end;
  });
  const defaultDayKey =
    initialSelectedDayKey &&
    initialVisibleDays.some((day) => day.dateKey === initialSelectedDayKey)
      ? initialSelectedDayKey
      : (initialVisibleDays[0]?.dateKey ?? null);
  const [localDays, setLocalDays] = useState(days);
  const [localPlannerPool, setLocalPlannerPool] = useState(plannerPool);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    defaultDayKey,
  );
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlotState | null>(
    null,
  );
  /** Tracks which day the auto-select effect last applied to; avoids reopening the editor after the user closes it on the same day. */
  const prevSelectedDayKeyForEditorRef = useRef<string | null>(null);
  const [removeDayWarning, setRemoveDayWarning] =
    useState<RemoveDayWarningState | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<DuplicateRecipeState | null>(
    null,
  );
  const [isSaving, startSavingTransition] = useTransition();
  const [isAddingDay, startAddDayTransition] = useTransition();
  const [isRemovingDay, startRemoveDayTransition] = useTransition();
  const isContentPending = isLogFilterPending;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );
  const visibleDays = useMemo(
    () =>
      localDays.filter((day) => {
        if (!dateRange) return true;
        return day.dateKey >= dateRange.start && day.dateKey <= dateRange.end;
      }),
    [dateRange, localDays],
  );

  const visiblePlannerPool = useMemo(
    () =>
      localPlannerPool.filter((item) => {
        if (!dateRange) return true;
        const dateKey = item.date.toISOString().slice(0, 10);
        return dateKey >= dateRange.start && dateKey <= dateRange.end;
      }),
    [dateRange, localPlannerPool],
  );
  // Pool list is local so drag-drop can remove cards optimistically before refresh.
  const groupedPlannerPool = buildGroupedPlannerPoolCards(visiblePlannerPool);

  useEffect(() => {
    setLocalDays(days);
  }, [days]);

  useEffect(() => {
    setLocalPlannerPool(plannerPool);
  }, [plannerPool]);

  useEffect(() => {
    if (!initialSelectedDayKey) {
      return;
    }

    const existsInDays = visibleDays.some(
      (day) => day.dateKey === initialSelectedDayKey,
    );
    if (!existsInDays) {
      return;
    }

    // Keep client selection in sync with URL day changes (e.g. after adding a new day).
    setSelectedDayKey((prev) =>
      prev === initialSelectedDayKey ? prev : initialSelectedDayKey,
    );
    setSelectedSlot((prev) =>
      prev?.dayKey === initialSelectedDayKey ? prev : null,
    );
  }, [initialSelectedDayKey, visibleDays]);

  useEffect(() => {
    if (!selectedDayKey || visibleDays.length === 0) {
      setSelectedDayKey(visibleDays[0]?.dateKey ?? null);
      return;
    }

    const stillExists = visibleDays.some((day) => day.dateKey === selectedDayKey);
    if (!stillExists) {
      setSelectedDayKey(visibleDays[0]?.dateKey ?? null);
      setSelectedSlot(null);
    }
  }, [selectedDayKey, visibleDays]);

  useEffect(() => {
    // Wait for viewport detection; prevents opening details by default on phones.
    if (isPhoneViewport === undefined) {
      return;
    }

    // Phone-only behavior: details stay closed until the user explicitly opens one.
    if (isPhoneViewport) {
      return;
    }

    if (!selectedDayKey) {
      return;
    }

    const activeDay = visibleDays.find((day) => day.dateKey === selectedDayKey);
    if (!activeDay) {
      return;
    }

    // Selection already matches this day — keep ref in sync for the "dismiss on same day" case below.
    if (selectedSlot?.dayKey === selectedDayKey) {
      prevSelectedDayKeyForEditorRef.current = selectedDayKey;
      return;
    }

    const dayKeyChanged =
      prevSelectedDayKeyForEditorRef.current !== selectedDayKey;

    // User dismissed the details panel on this day; do not immediately re-select the first entry.
    if (!dayKeyChanged && selectedSlot === null) {
      return;
    }

    for (const slot of activeDay.slots) {
      if (!slot.entryId) {
        continue;
      }

      const firstRecipe = slot.recipes[0];
      prevSelectedDayKeyForEditorRef.current = selectedDayKey;
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
  }, [isPhoneViewport, selectedDayKey, selectedSlot, visibleDays]);

  const selectEmptySlot = (
    day: LogDayData,
    slot: LogDayData["slots"][number],
  ) => {
    if (!slot.entryId) {
      toast.error("Cannot edit this slot yet");
      return;
    }

    // Match recipe-card UX: second click on the same empty slot closes details.
    if (
      selectedSlot &&
      selectedSlot.dayKey === day.dateKey &&
      selectedSlot.mealType === slot.mealType &&
      selectedSlot.entryId === slot.entryId &&
      selectedSlot.selectedRecipeId === null &&
      selectedSlot.entryRecipeId === null
    ) {
      setSelectedSlot(null);
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

    // Second click on the same card closes the details panel (selection toggles).
    if (
      selectedSlot &&
      isLogRecipeCardSelected(
        {
          dayKey: selectedSlot.dayKey,
          mealType: selectedSlot.mealType,
          entryRecipeId: selectedSlot.entryRecipeId,
          selectedRecipeId: selectedSlot.selectedRecipeId,
        },
        day.dateKey,
        slot,
        recipe,
      )
    ) {
      setSelectedSlot(null);
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
    const targetDayKey = (overData.dateKey as string) ?? null;
    const targetMealType =
      (overData.mealType as LogDayData["slots"][number]["mealType"] | undefined) ??
      null;
    const targetEntryId = overData.entryId as string;
    const previousDays = localDays;
    const previousPlannerPool = localPlannerPool;
    const previousSelectedDayKey = selectedDayKey;
    const previousSelectedSlot = selectedSlot;
    const targetDay = previousDays.find((day) => day.dateKey === targetDayKey) ?? null;
    const targetSlot =
      targetDay?.slots.find((slot) => slot.mealType === targetMealType) ?? null;

    if (!targetDay || !targetSlot?.entryId) {
      toast.error("Cannot place meal into this slot");
      return;
    }

    const initialRows = plannerItem.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      unitId: ingredient.unitId,
      amount: ingredient.amount,
    }));

    // Optimistic card shown immediately on drop to avoid snap-back before server confirms.
    const optimisticRecipe = {
      id: `placed-${targetEntryId}-${plannerItem.id}`,
      entryId: targetEntryId,
      entryRecipeId: null,
      sourceRecipeId: plannerItem.sourceRecipeId,
      mealLabel: targetSlot.label,
      cardKind: "recipe" as const,
      title: plannerItem.title,
      slug: null,
      imageUrl: plannerItem.imageUrl,
      calories: 0,
      proteins: 0,
      fats: 0,
      carbs: 0,
      ingredients: initialRows.map((ingredient) => ({
        ingredientId: ingredient.ingredientId,
        ingredientName: null,
        unitId: ingredient.unitId,
        unitName: null,
        amount: ingredient.amount,
      })),
    };

    setLocalDays((prev) =>
      prev.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => {
          if (slot.entryId !== targetEntryId) return slot;
          const existingIndex = slot.recipes.findIndex(
            (recipe) => recipe.entryId === targetEntryId,
          );
          const nextRecipes = [...slot.recipes];
          if (existingIndex >= 0) {
            nextRecipes[existingIndex] = optimisticRecipe;
          } else {
            nextRecipes.unshift(optimisticRecipe);
          }
          return {
            ...slot,
            recipes: nextRecipes,
          };
        }),
      })),
    );

    // Remove the dropped card from the planner pool immediately to avoid flash-back.
    setLocalPlannerPool((prev) =>
      prev.filter((poolItem) => poolItem.id !== plannerItem.id),
    );

    // Open details immediately for the dropped meal.
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

    startSavingTransition(async () => {
      const result = await placePlannerPoolItemAction({
        logId,
        person,
        entryId: targetEntryId,
        sourceRecipeId: plannerItem.sourceRecipeId ?? "",
        ingredients: plannerItem.ingredients,
      });

      if (result.type === "error") {
        // Roll back optimistic card/selection if persistence fails.
        setLocalDays(previousDays);
        setLocalPlannerPool(previousPlannerPool);
        setSelectedDayKey(previousSelectedDayKey);
        setSelectedSlot(previousSelectedSlot);
        toast.error(result.message);
        return;
      }

      router.refresh();
    });
  };

  const handleRemovePlacedRecipe = (slot: LogDayData["slots"][number]) => {
    if (!logId || !person || !slot.entryId) {
      toast.error("Missing log context for this action");
      return;
    }

    const previousDays = localDays;
    const previousPlannerPool = localPlannerPool;
    const previousSelectedDayKey = selectedDayKey;
    const previousSelectedSlot = selectedSlot;
    const targetDay = previousDays.find((day) =>
      day.slots.some((candidateSlot) => candidateSlot.entryId === slot.entryId),
    );
    const targetDate = targetDay?.date ?? new Date();
    const targetDateKey = targetDay?.dateKey ?? targetDate.toISOString().slice(0, 10);
    const removedRecipe = slot.recipes[0] ?? null;
    const optimisticPoolIngredients =
      removedRecipe?.ingredients?.flatMap((ingredient) => {
        if (
          ingredient.ingredientId == null ||
          ingredient.unitId == null ||
          ingredient.amount == null
        ) {
          return [];
        }
        return [
          {
            ingredientId: ingredient.ingredientId,
            unitId: ingredient.unitId,
            amount: ingredient.amount,
          },
        ];
      }) ?? [];

    const optimisticPoolItem =
      removedRecipe?.sourceRecipeId &&
      removedRecipe.planSlotId &&
      optimisticPoolIngredients.length > 0 &&
      targetDay != null
        ? {
            id: removedRecipe.id,
            date: targetDate,
            dateKey: targetDateKey,
            mealType: slot.mealType,
            mealLabel: slot.label,
            title: removedRecipe.title,
            sourceRecipeId: removedRecipe.sourceRecipeId,
            imageUrl: removedRecipe.imageUrl,
            ingredients: optimisticPoolIngredients,
          }
        : null;

    // Optimistically clear slot and close details immediately.
    setLocalDays((prev) =>
      prev.map((day) => ({
        ...day,
        slots: day.slots.map((s) =>
          s.entryId === slot.entryId ? { ...s, recipes: [] } : s,
        ),
      })),
    );

    if (optimisticPoolItem) {
      setLocalPlannerPool((prev) => {
        if (prev.some((poolItem) => poolItem.id === optimisticPoolItem.id)) {
          return prev;
        }
        return [optimisticPoolItem, ...prev];
      });
    }

    setSelectedSlot(null);

    startSavingTransition(async () => {
      const result = await clearLogEntryAssignmentAction({
        logId,
        person,
        entryId: slot.entryId!,
      });

      if (result.type === "error") {
        // Restore slot/pool/selection state when optimistic remove fails.
        setLocalDays(previousDays);
        setLocalPlannerPool(previousPlannerPool);
        setSelectedDayKey(previousSelectedDayKey);
        setSelectedSlot(previousSelectedSlot);
        toast.error(result.message);
        return;
      }

      router.refresh();
    });
  };

  const handleOpenDuplicateDialog = (
    recipe: LogDayData["slots"][number]["recipes"][number],
  ) => {
    if (!recipe.entryId) {
      toast.error("Missing source entry for duplication");
      return;
    }

    const copyIngredients =
      recipe.ingredients?.flatMap((ingredient) => {
        if (
          ingredient.ingredientId == null ||
          ingredient.unitId == null ||
          ingredient.amount == null
        ) {
          return [];
        }
        return [
          {
            ingredientId: ingredient.ingredientId,
            unitId: ingredient.unitId,
            amount: ingredient.amount,
          },
        ];
      }) ?? [];

    setDuplicateSource({
      sourceEntryId: recipe.entryId,
      sourceRecipeId: recipe.sourceRecipeId,
      ingredients: copyIngredients,
    });
  };

  const handleDuplicateEntry = (payload: {
    targetDay: string;
    targetMealType: LogMealType;
  }) => {
    if (!logId || !person || !duplicateSource) {
      toast.error("Missing log context for this action");
      return;
    }

    const targetDay = visibleDays.find((day) => day.dateKey === payload.targetDay);
    if (!targetDay) {
      toast.error("Selected date is not available in this log");
      return;
    }

    const targetSlot = targetDay.slots.find(
      (slot) => slot.mealType === payload.targetMealType,
    );
    if (!targetSlot?.entryId) {
      toast.error("Cannot duplicate into this slot");
      return;
    }

    startSavingTransition(async () => {
      const result = await duplicateLogEntryAction({
        logId,
        person,
        sourceEntryId: duplicateSource.sourceEntryId,
        sourceRecipeId: duplicateSource.sourceRecipeId,
        targetDay: payload.targetDay,
        targetMealType: payload.targetMealType,
        ingredients: duplicateSource.ingredients,
      });

      if (result.type === "error") {
        toast.error(result.message);
        return;
      }

      // Close modal before navigation so returning back does not reopen stale state.
      setDuplicateSource(null);
      setSelectedDayKey(payload.targetDay);
      setSelectedSlot(null);
      router.push(`${ROUTES.logView(logId)}?person=${person}&day=${payload.targetDay}`);
      router.refresh();
      toast.success("Entry duplicated");
    });
  };

  const handleSelectDay = (dateKey: string) => {
    setSelectedDayKey(dateKey);
    setSelectedSlot(null);
  };

  const handleAddDay = () => {
    if (!allowDayManagement) return;
    if (!logId) return;

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
  };

  const handleRemoveDay = (dateKey: string) => {
    if (!allowDayManagement) return;
    if (!logId) {
      return;
    }
    setRemoveDayWarning({
      dateKey,
      impactedLogMealsCount: 0,
      impactedPlanMealsCount: 0,
    });
  };

  const removeDayDialogWarning =
    removeDayWarning == null
      ? null
      : removeDayWarning.impactedLogMealsCount === 0 &&
          removeDayWarning.impactedPlanMealsCount === 0
        ? null
        : {
            impactedLogMealsCount: removeDayWarning.impactedLogMealsCount,
            impactedPlanMealsCount: removeDayWarning.impactedPlanMealsCount,
          };

  const handleRemoveDayDialogOpenChange = (open: boolean) => {
    if (!open) setRemoveDayWarning(null);
  };

  const handleConfirmRemoveDay = () => {
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
  };

  const activeDay = visibleDays.find((d) => d.dateKey === selectedDayKey) ?? null;
  const editorSlot =
    activeDay && selectedSlot?.dayKey === activeDay.dateKey
      ? selectedSlot
      : null;

  if (visibleDays.length === 0) {
    return (
      <section
        className="rounded-lg border p-6 space-y-3 data-[pending=true]:animate-pulse"
        data-pending={isContentPending}
      >
        <h2 className="text-lg font-medium">No log entries in selected range</h2>
        <p className="text-sm text-muted-foreground">
          Adjust the shared date range or switch person.
        </p>
      </section>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <section
        className="space-y-8 data-[pending=true]:animate-pulse"
        data-pending={isContentPending}
      >
        <LogRemoveDayAlertDialog
          open={removeDayWarning != null}
          warning={removeDayDialogWarning}
          onOpenChange={handleRemoveDayDialogOpenChange}
          onConfirm={handleConfirmRemoveDay}
        />
        <LogDuplicateEntryDialog
          open={duplicateSource != null}
          availableDateKeys={visibleDays.map((day) => day.dateKey)}
          defaultDateKey={activeDay?.dateKey ?? selectedDayKey}
          isSubmitting={isSaving}
          onOpenChange={(open) => {
            if (!open) {
              setDuplicateSource(null);
            }
          }}
          onSubmit={handleDuplicateEntry}
        />
        {activeDay ? (
          <LogActiveDayView
            day={activeDay}
            days={visibleDays}
            groupedPlannerPool={groupedPlannerPool}
            editorSlot={editorSlot}
            ingredientOptions={ingredientOptions}
            recipeOptions={recipeOptions}
            isSaving={isSaving}
            isAddingDay={isAddingDay}
            isRemovingDay={isRemovingDay}
            logId={logId}
            showDayControls
            showDayManagementActions={allowDayManagement}
            showPageHeader={false}
            onSelectDay={handleSelectDay}
            onAddDay={handleAddDay}
            onRemoveDay={() => handleRemoveDay(activeDay.dateKey)}
            onEmptySlotClick={(slot) => selectEmptySlot(activeDay, slot)}
            onRecipeClick={(slot, recipe) =>
              selectRecipeSlot(activeDay, slot, recipe)
            }
            onRecipeRemove={handleRemovePlacedRecipe}
            onRecipeCopy={(_slot, recipe) => handleOpenDuplicateDialog(recipe)}
            onSelectedRecipeIdChange={handleSelectedRecipeChange}
            onSave={handleSlotSave}
          />
        ) : null}
      </section>
    </DndContext>
  );
}

export { LogDayViewController as LogDayView };
