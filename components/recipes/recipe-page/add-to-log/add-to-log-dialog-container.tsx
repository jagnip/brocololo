"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogMealType, LogPerson } from "@/src/generated/enums";
import { RecipeAddToLogDialog } from "./add-to-log-dialog";
import type {
  EditableIngredientRow,
  LogIngredientOption,
} from "../../../log/log-ingredients-form";
import { addRecipeToLogAction } from "@/actions/log-actions";
import { DatePicker } from "@/components/ui/date-picker-rac";
import { Label } from "@/components/ui/label";
import type { RecipeType } from "@/types/recipe";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";

type IngredientFormDependencies = {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; namePlural: string | null }>;
  gramsUnitId: string;
  iconOptions: string[];
};

type RecipeAddToLogDialogProps = {
  recipeId: string;
  recipeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeIngredients: RecipeType["ingredients"];
  currentServings: number;
  servingScalingFactor: number;
  servingMultiplierForNelson: number;
  ingredientOptions: LogIngredientOption[];
  ingredientFormDependencies: IngredientFormDependencies;
};

const LOG_MEAL_OPTIONS = [
  { value: LogMealType.BREAKFAST, label: "Breakfast" },
  { value: LogMealType.LUNCH, label: "Lunch" },
  { value: LogMealType.SNACK, label: "Snack" },
  { value: LogMealType.DINNER, label: "Dinner" },
] as const;

export function RecipeAddToLogDialogContainer({
  recipeId,
  recipeName,
  open,
  onOpenChange,
  recipeIngredients,
  currentServings,
  servingScalingFactor,
  servingMultiplierForNelson,
  ingredientOptions,
  ingredientFormDependencies,
}: RecipeAddToLogDialogProps) {
  const router = useRouter();
  const [isSaving, startSavingTransition] = useTransition();
  const [logPerson, setLogPerson] = useState<"PRIMARY" | "SECONDARY">(
    LogPerson.PRIMARY,
  );
  const [logDate, setLogDate] = useState(() => toDateInputValue(new Date()));
  const [logMealType, setLogMealType] = useState<
    "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER"
  >(LogMealType.DINNER);

  // Reset flow-specific state each time the dialog opens.
  useEffect(() => {
    if (!open) {
      return;
    }
    setLogPerson(LogPerson.PRIMARY);
    setLogDate(toDateInputValue(new Date()));
    setLogMealType(LogMealType.DINNER);
  }, [open]);

  const initialRows = useMemo(() => {
    const selectedPerson =
      logPerson === LogPerson.PRIMARY ? "primary" : "secondary";

    return recipeIngredients.flatMap((recipeIngredient) => {
      if (recipeIngredient.amount == null) {
        return [];
      }

      const scaledAmount = recipeIngredient.amount * servingScalingFactor;
      const amountForPerson = getPersonIngredientAmountPerMeal({
        amount: scaledAmount,
        nutritionTarget: recipeIngredient.nutritionTarget,
        person: selectedPerson,
        recipeServings: currentServings,
        servingMultiplierForNelson,
      });
      if (amountForPerson == null || amountForPerson <= 0) {
        return [];
      }

      const defaultUnitId = getDefaultUnitIdForIngredient({
        defaultUnitId: recipeIngredient.ingredient.defaultUnitId,
        unitConversions: recipeIngredient.ingredient.unitConversions,
      });

      return [
        {
          ingredientId: recipeIngredient.ingredient.id,
          unitId: recipeIngredient.unit?.id ?? defaultUnitId,
          amount: Math.round(amountForPerson * 1000) / 1000,
        },
      ];
    });
  }, [
    currentServings,
    logPerson,
    recipeIngredients,
    servingMultiplierForNelson,
    servingScalingFactor,
  ]);

  const selectedMealLabel =
    LOG_MEAL_OPTIONS.find((option) => option.value === logMealType)?.label ??
    "Dinner";

  return (
    <RecipeAddToLogDialog
      open={open}
      // Keep modal title in sentence case for consistent UI copy.
      title={`Add ${recipeName.toLocaleLowerCase()} to log`}
      subtitle={`${selectedMealLabel} • ${logDate}`}
      initialRows={initialRows}
      ingredientOptions={ingredientOptions}
      ingredientFormDependencies={ingredientFormDependencies}
      isSaving={isSaving}
      saveLabel="Add to log"
      contextControls={
        <div className="flex w-full flex-wrap items-start gap-2 md:flex-nowrap">
          {/* Mobile: Person + Meal first row, Date second row. Tablet/Desktop: single row. */}
          <div className="min-w-0 flex-1 basis-0 space-y-2 lg:w-[300px] lg:flex-none">
            <Label>Person</Label>
            <Select
              value={logPerson}
              onValueChange={(nextValue) =>
                setLogPerson(nextValue as "PRIMARY" | "SECONDARY")
              }
              disabled={isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LogPerson.PRIMARY}>Jagoda</SelectItem>
                <SelectItem value={LogPerson.SECONDARY}>Nelson</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1 basis-0 space-y-2 lg:w-[300px] lg:flex-none">
            <Label>Meal</Label>
            <Select
              value={logMealType}
              onValueChange={(nextValue) =>
                setLogMealType(
                  nextValue as "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER",
                )
              }
              disabled={isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOG_MEAL_OPTIONS.map((meal) => (
                  <SelectItem key={meal.value} value={meal.value}>
                    {meal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-2 md:w-auto md:min-w-0 md:flex-1 md:basis-0 lg:w-[300px] lg:flex-none">
            <Label>Date</Label>
            {/* Reuse shared shadcn-style date picker for consistent behavior. */}
            <DatePicker
              value={logDate}
              onChange={setLogDate}
              disabled={isSaving}
            />
          </div>
        </div>
      }
      onOpenChange={onOpenChange}
      onSave={async (rows: EditableIngredientRow[]) => {
        if (!logDate) {
          toast.error("Date is required");
          return;
        }

        startSavingTransition(async () => {
          const completeRows = rows.filter(
            (
              row: EditableIngredientRow,
            ): row is {
              ingredientId: string;
              unitId: string;
              amount: number;
            } =>
              row.ingredientId != null &&
              row.unitId != null &&
              row.amount != null &&
              row.amount > 0,
          );
          const result = await addRecipeToLogAction({
            recipeId,
            person: logPerson,
            date: logDate,
            mealType: logMealType,
            ingredients: completeRows,
          });

          if (result.type === "error") {
            toast.error(result.message);
            return;
          }

          onOpenChange(false);
          router.refresh();
          toast.success("Recipe added to log");
        });
      }}
    />
  );
}

function toDateInputValue(date: Date) {
  // Keep stable ISO date format for date picker state.
  return date.toISOString().slice(0, 10);
}
