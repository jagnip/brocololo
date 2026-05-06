"use client";

import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { GroceriesEditRow } from "@/components/groceries/groceries-edit-row";
import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";

type GroceriesEditCategorySectionProps = {
  categoryId: string;
  title: string;
  rows: GroceriesEditableRow[];
  ingredientOptionsByCategoryId: Map<string, SearchableSelectOption[]>;
  renderIngredientDropdownLabel: (option: SearchableSelectOption) => React.ReactNode;
  renderIngredientTriggerLabel: (option: SearchableSelectOption) => React.ReactNode;
  ingredientById: Map<string, GroceriesEditIngredientOption>;
  unitById: Map<string, GroceriesEditUnitOption>;
  onRowChange: (rowId: string, next: Partial<GroceriesEditableRow>) => void;
};

export function GroceriesEditCategorySection({
  categoryId,
  title,
  rows,
  ingredientOptionsByCategoryId,
  renderIngredientDropdownLabel,
  renderIngredientTriggerLabel,
  ingredientById,
  unitById,
  onRowChange,
}: GroceriesEditCategorySectionProps) {
  const ingredientOptions = ingredientOptionsByCategoryId.get(categoryId) ?? [];

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <GroceriesEditRow
            key={row.id}
            row={row}
            ingredientOptions={ingredientOptions}
            renderIngredientDropdownLabel={renderIngredientDropdownLabel}
            renderIngredientTriggerLabel={renderIngredientTriggerLabel}
            ingredientById={ingredientById}
            unitById={unitById}
            onRowChange={onRowChange}
          />
        ))}
      </div>
    </section>
  );
}
