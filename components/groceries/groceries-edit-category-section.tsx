"use client";

import { Button } from "@/components/ui/button";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { GroceriesEditRow } from "@/components/groceries/groceries-edit-row";
import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";

type GroceriesEditCategorySectionProps = {
  categoryId: string;
  sectionId: string;
  sectionRef?: (node: HTMLElement | null) => void;
  title: string;
  rows: GroceriesEditableRow[];
  ingredientOptionsByCategoryId: Map<string, SearchableSelectOption[]>;
  renderIngredientDropdownLabel: (option: SearchableSelectOption) => React.ReactNode;
  renderIngredientTriggerLabel: (option: SearchableSelectOption) => React.ReactNode;
  ingredientById: Map<string, GroceriesEditIngredientOption>;
  unitById: Map<string, GroceriesEditUnitOption>;
  onRowChange: (rowId: string, next: Partial<GroceriesEditableRow>) => void;
  onRowRemove: (rowId: string) => void;
  // Appends a new empty row to this section. Receives the section's category
  // id so the parent can scope the new row to the correct category.
  onAddRow: (categoryId: string) => void;
  // Optional ref-registration callback per row. Lets the parent collect each
  // row's DOM node in a Map keyed by row id, so library "+" can scroll to it.
  registerRowRef?: (rowId: string, node: HTMLElement | null) => void;
  // Row id that was just added via the library "+" button. The matching row
  // briefly shows a highlight ring to draw the eye.
  highlightedRowId?: string | null;
};

export function GroceriesEditCategorySection({
  categoryId,
  sectionId,
  sectionRef,
  title,
  rows,
  ingredientOptionsByCategoryId,
  renderIngredientDropdownLabel,
  renderIngredientTriggerLabel,
  ingredientById,
  unitById,
  onRowChange,
  onRowRemove,
  onAddRow,
  registerRowRef,
  highlightedRowId,
}: GroceriesEditCategorySectionProps) {
  const ingredientOptions = ingredientOptionsByCategoryId.get(categoryId) ?? [];

  return (
    <section
      id={sectionId}
      ref={sectionRef}
      data-category-id={categoryId}
      className="scroll-mt-28 space-y-3"
    >
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
            onRowRemove={onRowRemove}
            // Wire each row's DOM node up through the section to the parent
            // edit-list so library "+" can scrollIntoView the right element.
            rowRef={
              registerRowRef
                ? (node) => registerRowRef(row.id, node)
                : undefined
            }
            highlighted={highlightedRowId === row.id}
          />
        ))}
      </div>
      {/* Per-section footer action mirrors the recipe form's "Add Ingredient"
          button: clicking appends an empty row inside this category. */}
      <Button
        type="button"
        variant="outline"
        onClick={() => onAddRow(categoryId)}
      >
        Add item
      </Button>
    </section>
  );
}
