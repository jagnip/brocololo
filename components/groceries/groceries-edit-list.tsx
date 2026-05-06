"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveShoppingListEditsAction } from "@/actions/shopping-list-actions";
import { GroceriesEditCategorySection } from "@/components/groceries/groceries-edit-category-section";
import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
  GroceriesEditListModel,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";
import { ROUTES } from "@/lib/constants";
import { TopbarConfigController } from "@/components/topbar-config";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  type IngredientSearchSelectSource,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

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
    ingredientId: item.groceryIngredient?.ingredient?.id ?? null,
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
  const router = useRouter();
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

  const ingredientOptionsByCategoryId = useMemo(() => {
    const sourcesByCategoryId = new Map<string, IngredientSearchSelectSource[]>();

    for (const ingredient of ingredients) {
      const bucket = sourcesByCategoryId.get(ingredient.category.id) ?? [];
      bucket.push({
        id: ingredient.id,
        name: ingredient.name,
        brand: ingredient.brand,
        descriptor: ingredient.descriptor,
        icon: ingredient.icon,
      });
      sourcesByCategoryId.set(ingredient.category.id, bucket);
    }

    return new Map(
      [...sourcesByCategoryId.entries()].map(([categoryId, sources]) => [
        categoryId,
        ingredientsToSearchableSelectOptions(sources),
      ]),
    );
  }, [ingredients]);
  const ingredientByIdForSelect = useMemo(
    () =>
      buildIngredientSearchSourceMap(
        ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          brand: ingredient.brand,
          descriptor: ingredient.descriptor,
          icon: ingredient.icon,
        })),
      ),
    [ingredients],
  );
  const renderIngredientDropdownLabel = useCallback(
    (option: SearchableSelectOption) => {
      const ingredient = ingredientByIdForSelect.get(option.value);
      const descriptor = ingredient?.descriptor?.trim();
      return (
        <span className="flex min-w-0 flex-col gap-0.5 text-left">
          <span className="truncate font-normal text-foreground">{option.label}</span>
          {descriptor ? (
            <span className="truncate text-xs leading-snug text-muted-foreground">
              {descriptor}
            </span>
          ) : null}
        </span>
      );
    },
    [ingredientByIdForSelect],
  );
  const renderIngredientTriggerLabel = useCallback(
    (option: SearchableSelectOption) => {
      const ingredient = ingredientByIdForSelect.get(option.value);
      const descriptor = ingredient?.descriptor?.trim();
      return (
        <span className="flex min-w-0 max-w-full items-baseline gap-x-1.5 truncate text-left">
          <span className="shrink-0 font-normal text-foreground">{option.label}</span>
          {descriptor ? (
            <span className="min-w-0 truncate font-normal text-muted-foreground">
              · {descriptor}
            </span>
          ) : null}
        </span>
      );
    },
    [ingredientByIdForSelect],
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
  const isSaveDisabled = isPending || !hasUnsavedChanges;

  const rangeLabel = formatDateRange(list.plan.startDate, list.plan.endDate);
  const topbarConfig = useMemo(
    () => ({
      actions: [
        {
          id: "save-groceries",
          label: isPending ? "Saving groceries..." : "Save groceries",
          onClick: () => {
            startTransition(async () => {
              const result = await saveShoppingListEditsAction({
                planId: list.plan.id,
                items: rows.map((row) => ({
                  ...row,
                  ingredientId:
                    row.ingredientId && row.ingredientId.trim() !== ""
                      ? row.ingredientId
                      : null,
                })),
              });
              if (result.type === "error") {
                toast.error(result.message);
                return;
              }
              // Keep local baseline in sync in case navigation is delayed.
              setInitialRows(rows);
              toast.success("Grocery edits saved.");
              router.push(ROUTES.groceriesView(list.plan.id));
              router.refresh();
            });
          },
          disabled: isSaveDisabled,
          variant: "default" as const,
          size: "default" as const,
        },
      ],
    }),
    [isPending, isSaveDisabled, list.plan.id, router, rows, startTransition],
  );

  return (
    <div className="space-y-8">
      <TopbarConfigController config={topbarConfig} />
      <header className="space-y-1">
        <h1 className="type-h1">Edit groceries for {rangeLabel}</h1>
      </header>

      <div className="space-y-8">
        {groupedSections.map((section) => (
          <GroceriesEditCategorySection
            key={section.categoryId}
            title={section.title}
            rows={section.rows}
            categoryId={section.categoryId}
            ingredientOptionsByCategoryId={ingredientOptionsByCategoryId}
            renderIngredientDropdownLabel={renderIngredientDropdownLabel}
            renderIngredientTriggerLabel={renderIngredientTriggerLabel}
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
