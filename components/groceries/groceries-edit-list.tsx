"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveShoppingListEditsAction } from "@/actions/shopping-list-actions";
import { GroceriesEditCategorySection } from "@/components/groceries/groceries-edit-category-section";
import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
  GroceriesEditListModel,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import {
  ingredientsToSearchableSelectOptions,
  type IngredientSearchSelectSource,
} from "@/components/ingredients/ingredient-searchable-select-labels";

type GroceriesEditListProps = {
  list: GroceriesEditListModel;
  ingredients: GroceriesEditIngredientOption[];
  units: GroceriesEditUnitOption[];
};

function formatDateRange(start: Date, end: Date): string {
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    const month = end.toLocaleDateString("en-US", { month: "short" });
    return `${start.getDate()} - ${end.getDate()} ${month}`;
  }

  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${startStr} - ${endStr}`;
}

function toEditableRows(list: GroceriesEditListModel): GroceriesEditableRow[] {
  return list.items.map((item) => ({
    id: item.id,
    ingredientId: item.groceryIngredient?.ingredient?.id ?? "",
    ingredientCategoryId: item.ingredientCategoryId,
    displayLabel: item.displayLabel,
    amount: item.amount,
    unitId: item.unitId,
    substitutionsAllowed: item.substitutionsAllowed,
    substitutionNote: item.substitutionNote,
    additionalInfo: item.additionalInfo,
  }));
}

export function toComparableRows(rows: GroceriesEditableRow[]) {
  return [...rows]
    .map((row) => ({
      id: row.id,
      ingredientId: row.ingredientId,
      ingredientCategoryId: row.ingredientCategoryId,
      displayLabel: row.displayLabel,
      amount: row.amount,
      unitId: row.unitId,
      substitutionsAllowed: row.substitutionsAllowed,
      substitutionNote: row.substitutionNote ?? null,
      additionalInfo: row.additionalInfo ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function hasGroceriesEditChanges(
  initialRows: GroceriesEditableRow[],
  currentRows: GroceriesEditableRow[],
) {
  return (
    JSON.stringify(toComparableRows(initialRows)) !==
    JSON.stringify(toComparableRows(currentRows))
  );
}

export function GroceriesEditList({
  list,
  ingredients,
  units,
}: GroceriesEditListProps) {
  const [isPending, startTransition] = useTransition();
  const [initialRows, setInitialRows] = useState<GroceriesEditableRow[]>(() =>
    toEditableRows(list),
  );
  const [rows, setRows] = useState<GroceriesEditableRow[]>(() => toEditableRows(list));

  const ingredientById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient] as const)),
    [ingredients],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit] as const)),
    [units],
  );
  const categoryById = useMemo(
    () =>
      new Map(
        ingredients.map((ingredient) => [
          ingredient.category.id,
          ingredient.category,
        ] as const),
      ),
    [ingredients],
  );

  const ingredientSelectSources = useMemo(
    () =>
      ingredients.map(
        (ingredient): IngredientSearchSelectSource => ({
          id: ingredient.id,
          name: ingredient.name,
          brand: ingredient.brand,
          descriptor: ingredient.descriptor,
          icon: ingredient.icon,
          category: { name: ingredient.category.name },
        }),
      ),
    [ingredients],
  );
  const ingredientOptions = useMemo(
    () => ingredientsToSearchableSelectOptions(ingredientSelectSources),
    [ingredientSelectSources],
  );

  const groupedSections = useMemo(() => {
    const rowsByCategory = new Map<string, GroceriesEditableRow[]>();
    for (const row of rows) {
      const bucket = rowsByCategory.get(row.ingredientCategoryId) ?? [];
      bucket.push(row);
      rowsByCategory.set(row.ingredientCategoryId, bucket);
    }

    return [...rowsByCategory.entries()]
      .sort((a, b) => {
        const leftSort = categoryById.get(a[0])?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const rightSort = categoryById.get(b[0])?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return leftSort - rightSort;
      })
      .map(([categoryId, categoryRows]) => ({
        categoryId,
        title: categoryById.get(categoryId)?.name ?? "Uncategorized",
        rows: [...categoryRows].sort((a, b) =>
          a.displayLabel.localeCompare(b.displayLabel),
        ),
      }));
  }, [categoryById, rows]);

  const hasUnsavedChanges = useMemo(
    () => hasGroceriesEditChanges(initialRows, rows),
    [initialRows, rows],
  );
  const hasRowsWithoutIngredient = useMemo(
    () => rows.some((row) => !row.ingredientId),
    [rows],
  );

  const rangeLabel = formatDateRange(list.plan.startDate, list.plan.endDate);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="type-h1">Edit groceries for {rangeLabel}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={ROUTES.groceriesView(list.plan.id)}>Done</Link>
          </Button>
          <Button
            onClick={() => {
              startTransition(async () => {
                const result = await saveShoppingListEditsAction({
                  planId: list.plan.id,
                  items: rows,
                });
                if (result.type === "error") {
                  toast.error(result.message);
                  return;
                }
                // Promote current state to baseline so Save disables after success.
                setInitialRows(rows);
                toast.success("Grocery edits saved.");
              });
            }}
            disabled={isPending || !hasUnsavedChanges || hasRowsWithoutIngredient}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {hasRowsWithoutIngredient ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Some rows cannot be edited because they are missing an ingredient reference.
        </p>
      ) : null}

      <div className="space-y-8">
        {groupedSections.map((section) => (
          <GroceriesEditCategorySection
            key={section.categoryId}
            title={section.title}
            rows={section.rows}
            ingredientOptions={ingredientOptions}
            ingredientById={ingredientById}
            unitById={unitById}
            onRowChange={(rowId, next) => {
              // Row updates are centralized here so section components stay stateless.
              setRows((prev) =>
                prev.map((row) => (row.id === rowId ? { ...row, ...next } : row)),
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
