"use client";

import { toast } from "sonner";
import { LogMealType, LogPerson } from "@/src/generated/enums";
import {
  EditLogIngredientsDialog,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "@/components/log/edit-log-ingredients-dialog";
import { addRecipeToLogAction } from "@/actions/log-actions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  initialRows: EditableIngredientRow[];
  ingredientOptions: LogIngredientOption[];
  ingredientFormDependencies: IngredientFormDependencies;
  logPerson: "PRIMARY" | "SECONDARY";
  setLogPerson: (next: "PRIMARY" | "SECONDARY") => void;
  logDate: string;
  setLogDate: (next: string) => void;
  logMealType: "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
  setLogMealType: (next: "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER") => void;
  isSaving: boolean;
  startSavingTransition: (callback: () => Promise<void>) => void;
};

const LOG_MEAL_OPTIONS = [
  { value: LogMealType.BREAKFAST, label: "Breakfast" },
  { value: LogMealType.LUNCH, label: "Lunch" },
  { value: LogMealType.SNACK, label: "Snack" },
  { value: LogMealType.DINNER, label: "Dinner" },
] as const;

export function RecipeAddToLogDialog({
  recipeId,
  recipeName,
  open,
  onOpenChange,
  initialRows,
  ingredientOptions,
  ingredientFormDependencies,
  logPerson,
  setLogPerson,
  logDate,
  setLogDate,
  logMealType,
  setLogMealType,
  isSaving,
  startSavingTransition,
}: RecipeAddToLogDialogProps) {
  const selectedMealLabel =
    LOG_MEAL_OPTIONS.find((option) => option.value === logMealType)?.label ?? "Dinner";

  return (
    <EditLogIngredientsDialog
      open={open}
      title={`Add ${recipeName} to log`}
      subtitle={`${selectedMealLabel} • ${logDate}`}
      initialRows={initialRows}
      ingredientOptions={ingredientOptions}
      ingredientFormDependencies={ingredientFormDependencies}
      isSaving={isSaving}
      saveLabel="Add to log"
      contextControls={
        // Keep recipe-specific context controls in this wrapper so page stays focused.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
              Person
            </p>
            <Select
              value={logPerson}
              onValueChange={(nextValue) =>
                setLogPerson(nextValue as "PRIMARY" | "SECONDARY")
              }
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LogPerson.PRIMARY}>Jagoda</SelectItem>
                <SelectItem value={LogPerson.SECONDARY}>Nelson</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
              Date
            </p>
            <Input
              type="date"
              value={logDate}
              max="9999-12-31"
              onChange={(event) => setLogDate(event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
              Meal occasion
            </p>
            <Select
              value={logMealType}
              onValueChange={(nextValue) =>
                setLogMealType(nextValue as "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER")
              }
              disabled={isSaving}
            >
              <SelectTrigger>
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
        </div>
      }
      onOpenChange={onOpenChange}
      onSave={async (rows) => {
        if (!logDate) {
          toast.error("Date is required");
          return;
        }

        startSavingTransition(async () => {
          const completeRows = rows.filter(
            (row): row is { ingredientId: string; unitId: string; amount: number } =>
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
          toast.success("Recipe added to log");
        });
      }}
    />
  );
}
