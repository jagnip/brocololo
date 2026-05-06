"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveShoppingListEditsAction } from "@/actions/shopping-list-actions";
import { GroceriesEditCategorySection } from "@/components/groceries/groceries-edit-category-section";
import type {
  GroceriesEditableRow,
  GroceriesEditCategoryOption,
  GroceriesEditIngredientOption,
  GroceriesEditListModel,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";
import { ROUTES } from "@/lib/constants";
import { TopbarConfigController } from "@/components/topbar-config";
import { badgeVariants } from "@/components/ui/badge";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  type IngredientSearchSelectSource,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

type GroceriesEditListProps = {
  list: GroceriesEditListModel;
  ingredients: GroceriesEditIngredientOption[];
  // All ingredient categories (sorted by sortOrder asc). Drives section
  // rendering so categories without items still appear with their "Add item"
  // button — that's how a user can add the first item to an empty category.
  categories: GroceriesEditCategoryOption[];
  units: GroceriesEditUnitOption[];
  sidebar?: React.ReactNode;
};

function toEditableRows(list: GroceriesEditListModel): GroceriesEditableRow[] {
  return list.items.map((item) => ({
    id: item.id,
    // Hydrated from the DB → not new.
    isNew: false,
    ingredientId: item.groceryIngredient?.ingredient?.id ?? null,
    ingredientCategoryId: item.ingredientCategoryId,
    displayLabel: item.displayLabel,
    amount: item.amount,
    unitId: item.unitId,
    substitutionsAllowed: item.substitutionsAllowed,
    substitutionNote: item.substitutionNote,
    additionalInfo: item.additionalInfo,
    // Carried through purely for display; intentionally omitted from
    // toComparableRows so it never affects dirty-state or the save payload.
    recipeAttribution: item.recipeAttribution,
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
  categories,
  units,
  sidebar,
}: GroceriesEditListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [initialRows, setInitialRows] = useState<GroceriesEditableRow[]>(() =>
    toEditableRows(list),
  );
  const [rows, setRows] = useState<GroceriesEditableRow[]>(() => toEditableRows(list));
  const sectionElementByCategoryIdRef = useRef(new Map<string, HTMLElement>());
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const [optimisticCategoryId, setOptimisticCategoryId] = useState<string | null>(null);

  const ingredientById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient] as const)),
    [ingredients],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit] as const)),
    [units],
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
    // Bucket current rows by their category id so each section can pull its
    // rows in O(1).
    const rowsByCategory = new Map<string, GroceriesEditableRow[]>();
    for (const row of rows) {
      const bucket = rowsByCategory.get(row.ingredientCategoryId) ?? [];
      bucket.push(row);
      rowsByCategory.set(row.ingredientCategoryId, bucket);
    }

    // categories is pre-sorted by sortOrder asc, so we render every category
    // in canonical order. Empty categories still appear so the "Add item"
    // button stays reachable for them.
    return categories.map((category) => ({
      categoryId: category.id,
      title: category.name,
      rows: rowsByCategory.get(category.id) ?? [],
    }));
  }, [categories, rows]);
  const sectionRowCountByCategoryId = useMemo(
    () =>
      new Map(
        groupedSections.map((section) => [section.categoryId, section.rows.length] as const),
      ),
    [groupedSections],
  );

  const hasUnsavedChanges = useMemo(
    () => hasGroceriesEditChanges(initialRows, rows),
    [initialRows, rows],
  );
  const isSaveDisabled = isPending || !hasUnsavedChanges;
  const onRowRemove = useCallback((rowId: string) => {
    // Row removal is centralized with row updates to keep section components stateless.
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);
  const onAddRow = useCallback((categoryId: string) => {
    // New rows live entirely in form state until save; they get a temp UUID as
    // an id (used as React key + sent through to the action) and isNew:true so
    // the action layer routes them to create instead of update.
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        isNew: true,
        ingredientId: null,
        ingredientCategoryId: categoryId,
        displayLabel: "",
        amount: null,
        unitId: null,
        substitutionsAllowed: false,
        substitutionNote: null,
        additionalInfo: null,
        recipeAttribution: null,
      },
    ]);
  }, []);
  const setSectionElement = useCallback((categoryId: string, node: HTMLElement | null) => {
    if (node) {
      sectionElementByCategoryIdRef.current.set(categoryId, node);
      return;
    }
    sectionElementByCategoryIdRef.current.delete(categoryId);
  }, []);
  const onCategoryBadgeClick = useCallback((categoryId: string) => {
    // Optimistically mark the clicked section active before scroll settles.
    setOptimisticCategoryId(categoryId);
    const sectionElement = sectionElementByCategoryIdRef.current.get(categoryId);
    if (!sectionElement) return;
    sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  useEffect(() => {
    // Keep a valid active section when categories change.
    if (categories.length === 0) {
      setActiveCategoryId(null);
      setOptimisticCategoryId(null);
      return;
    }
    setActiveCategoryId((prev) =>
      prev && categories.some((category) => category.id === prev) ? prev : categories[0].id,
    );
  }, [categories]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length === 0) return;
        const mostVisibleEntry = visibleEntries.sort(
          (left, right) => right.intersectionRatio - left.intersectionRatio,
        )[0];
        const nextCategoryId = mostVisibleEntry.target.getAttribute("data-category-id");
        if (!nextCategoryId) return;
        setActiveCategoryId(nextCategoryId);
        // Once scrollspy catches up with the optimistic choice, drop override.
        setOptimisticCategoryId((prev) => (prev === nextCategoryId ? null : prev));
      },
      {
        // Shift active selection slightly below sticky controls.
        root: null,
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );
    const registeredElements = [...sectionElementByCategoryIdRef.current.values()];
    for (const element of registeredElements) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [groupedSections]);
  const selectedCategoryId = optimisticCategoryId ?? activeCategoryId;

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

      {/* Full-width sticky category navigator sits above all edit content. */}
      <div className="supports-backdrop-filter:bg-background/80 sticky top-14 z-30 hidden w-full bg-background/95 py-2 backdrop-blur sm:block">
        <div className="flex w-full flex-wrap gap-2">
          {groupedSections.map((section) => {
            const isActive = selectedCategoryId === section.categoryId;
            const isPopulated = (sectionRowCountByCategoryId.get(section.categoryId) ?? 0) > 0;
            const variant = isActive ? "default" : isPopulated ? "outline" : "secondary";
            return (
              <button
                key={section.categoryId}
                type="button"
                className={cn(
                  badgeVariants({ variant }),
                  "cursor-pointer transition-colors focus-visible:outline-none",
                )}
                aria-pressed={isActive}
                onClick={() => onCategoryBadgeClick(section.categoryId)}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          {groupedSections.map((section) => (
            <GroceriesEditCategorySection
              key={section.categoryId}
              sectionId={`groceries-category-${section.categoryId}`}
              sectionRef={(node) => setSectionElement(section.categoryId, node)}
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
              onRowRemove={onRowRemove}
              onAddRow={onAddRow}
            />
          ))}
        </div>

        {/* Keep library panel visually below the sticky category badges. */}
        <div className="hidden lg:block lg:pt-2">{sidebar}</div>
      </div>
    </div>
  );
}
