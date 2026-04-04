"use client";

import type { LogDayData, PlannerPoolGroupedCardData } from "@/lib/log/view-model";
import {
  LogIngredientsForm,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "./log-ingredients-form";
import { LogDayHeader } from "./log-day-header";
import { LogPool } from "./log-pool";
import { LogSlot } from "./log-slot";

/** Inline editor selection for the active log day (owned by `LogDayViewController`). */
export type SelectedSlotState = {
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

export type LogActiveDayViewProps = {
  day: LogDayData;
  days: LogDayData[];
  groupedPlannerPool: PlannerPoolGroupedCardData[];
  editorSlot: SelectedSlotState | null;
  ingredientOptions: LogIngredientOption[];
  recipeOptions: Array<{
    id: string;
    name: string;
    initialRows: EditableIngredientRow[];
  }>;
  isSaving: boolean;
  isAddingDay: boolean;
  isRemovingDay: boolean;
  logId?: string;
  person?: "PRIMARY" | "SECONDARY";
  onSelectDay: (dateKey: string) => void;
  onAddDay: () => void;
  onRemoveDay: () => void;
  onEmptySlotClick: (slot: LogDayData["slots"][number]) => void;
  onRecipeClick: (
    slot: LogDayData["slots"][number],
    recipe: LogDayData["slots"][number]["recipes"][number],
  ) => void;
  onRecipeRemove: (slot: LogDayData["slots"][number]) => void;
  onSelectedRecipeIdChange: (recipeId: string | null) => void;
  onSave: (rows: EditableIngredientRow[]) => Promise<void>;
};

/** Single active day: header, planner pool, meal slots, and optional ingredient editor. */
export function LogActiveDayView({
  day,
  days,
  groupedPlannerPool,
  editorSlot,
  ingredientOptions,
  recipeOptions,
  isSaving,
  isAddingDay,
  isRemovingDay,
  logId,
  person,
  onSelectDay,
  onAddDay,
  onRemoveDay,
  onEmptySlotClick,
  onRecipeClick,
  onRecipeRemove,
  onSelectedRecipeIdChange,
  onSave,
}: LogActiveDayViewProps) {
  const slots = day.slots.map((slot) => (
    <LogSlot
      key={`${day.dateKey}-${slot.mealType}`}
      dayKey={day.dateKey}
      slot={slot}
      onEmptyClick={() => onEmptySlotClick(slot)}
      onRecipeClick={(recipe) => onRecipeClick(slot, recipe)}
      onRecipeRemove={() => onRecipeRemove(slot)}
    />
  ));

  return (
    <article className="space-y-4">
      <LogDayHeader
        day={day}
        days={days}
        selectedDayKey={day.dateKey}
        onSelectDay={onSelectDay}
        logId={logId}
        person={person}
        isAddingDay={isAddingDay}
        onAddDay={onAddDay}
        isRemovingDay={isRemovingDay}
        onRemoveDay={onRemoveDay}
      />

      <div className="flex flex-col gap-4 2xl:grid 2xl:grid-cols-8 2xl:gap-4 2xl:items-stretch">
        <div className="2xl:col-span-2 2xl:min-h-0">
          <LogPool items={groupedPlannerPool} />
        </div>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5 lg:gap-4 2xl:contents">
          <div className="lg:col-span-2 2xl:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-1">
              {slots}
            </div>
          </div>

          <div className="lg:col-span-3 min-h-0 2xl:col-span-4">
            {editorSlot ? (
              <LogIngredientsForm
                title={editorSlot.mealLabel}
                subtitle={editorSlot.subtitle}
                initialRows={editorSlot.initialRows}
                ingredientOptions={ingredientOptions}
                isSaving={isSaving}
                recipeOptions={recipeOptions}
                selectedRecipeId={editorSlot.selectedRecipeId}
                initialSelectedRecipeId={editorSlot.initialSelectedRecipeId}
                onSelectedRecipeIdChange={onSelectedRecipeIdChange}
                onSave={onSave}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
