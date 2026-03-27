"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DailyLogIngredientsForm,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "./daily-log-ingredients-form";

type LogSlotIngredientsEditorProps = {
  title: string;
  subtitle: string;
  initialRows: EditableIngredientRow[];
  ingredientOptions: LogIngredientOption[];
  isSaving: boolean;
  recipeOptions: Array<{ id: string; name: string; initialRows: EditableIngredientRow[] }>;
  selectedRecipeId: string | null;
  onSelectedRecipeIdChange: (nextRecipeId: string | null) => void;
  onSave: (rows: EditableIngredientRow[]) => Promise<void>;
};

export function LogSlotIngredientsEditor({
  title,
  subtitle,
  initialRows,
  ingredientOptions,
  isSaving,
  recipeOptions,
  selectedRecipeId,
  onSelectedRecipeIdChange,
  onSave,
}: LogSlotIngredientsEditorProps) {
  return (
    <DailyLogIngredientsForm
      title={title}
      subtitle={subtitle}
      initialRows={initialRows}
      ingredientOptions={ingredientOptions}
      isSaving={isSaving}
      headerControls={
        <div className="space-y-2">
          <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
            Recipe (optional)
          </p>
          <SearchableSelect
            options={recipeOptions.map((recipe) => ({
              value: recipe.id,
              label: recipe.name,
            }))}
            value={selectedRecipeId}
            onValueChange={onSelectedRecipeIdChange}
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
      onSave={onSave}
    />
  );
}
