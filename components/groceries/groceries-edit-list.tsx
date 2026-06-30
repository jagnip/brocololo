"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveShoppingListEditsAction } from "@/actions/shopping-list-actions";
import { GroceriesEditCategorySection } from "@/components/groceries/groceries-edit-category-section";
import { GroceriesEditQuickAddSection } from "@/components/groceries/groceries-edit-quick-add-section";
import { GroceriesEditLibraryPanel } from "@/components/groceries/library/groceries-edit-library-panel";
import { CreateIngredientDialog } from "@/components/recipes/form/create-ingredient-dialog";
import { EditIngredientDialog } from "@/components/recipes/form/edit-ingredient-dialog";
import type {
  GroceriesEditableRow,
  GroceriesEditCategoryOption,
  GroceriesEditIngredientOption,
  GroceriesEditListModel,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";
import type { IngredientListWithItems } from "@/lib/db/ingredient-lists";
import {
  resolveAddIngredientToGroceries,
  shouldScrollAfterIngredientAdd,
  type QuickAddDraft,
  type QuickAddRowDraft,
} from "@/lib/groceries/groceries-add-ingredient";
import { getGroceryNotesFromIngredient } from "@/lib/groceries/get-grocery-notes-from-ingredient";
import { deriveSubstitutionsAllowed } from "@/lib/groceries/substitutions";
import { ROUTES } from "@/lib/constants";
import { formatDateRangeLabel } from "@/lib/format-date-range-label";
import { TopbarConfigController } from "@/components/topbar-config";
import { badgeVariants } from "@/components/ui/badge";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  renderIngredientSearchDropdownLabel,
  renderIngredientSearchTriggerLabel,
  type IngredientSearchSelectSource,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { reconcileGroceryRowUnitsAfterIngredientUpdate } from "@/lib/groceries/reconcile-grocery-row-units-after-ingredient-update";
import type { IngredientType } from "@/types/ingredient";

// How long the new-row highlight ring stays on after a library "+" lands.
// 1.5s is long enough to grab attention without nagging the user when they
// already know where the row is.
const ROW_HIGHLIGHT_DURATION_MS = 1500;

type GroceriesEditListProps = {
  list: GroceriesEditListModel;
  ingredients: GroceriesEditIngredientOption[];
  // All ingredient categories (sorted by sortOrder asc). Drives section
  // rendering so categories without items still appear with their "Add item"
  // button — that's how a user can add the first item to an empty category.
  categories: GroceriesEditCategoryOption[];
  units: GroceriesEditUnitOption[];
  // Global ingredient lists shown in the right-side library panel. Server
  // fetches them on the edit page so initial render is hydrated; subsequent
  // mutations go through server actions and `revalidatePath`.
  ingredientLists: IngredientListWithItems[];
  ingredientFormDependencies: {
    categories: Array<{ id: string; name: string }>;
    units: Array<{ id: string; name: string; namePlural: string | null }>;
    gramsUnitId: string;
    iconOptions: string[];
  };
  isAdmin?: boolean;
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

/** Persisted row ids removed via trash (not sent in items payload). */
export function getDeletedPersistedItemIds(
  initialRows: GroceriesEditableRow[],
  currentRows: GroceriesEditableRow[],
) {
  const currentIds = new Set(currentRows.map((row) => row.id));
  return initialRows
    .filter((row) => !row.isNew)
    .map((row) => row.id)
    .filter((id) => !currentIds.has(id));
}

export function GroceriesEditList({
  list,
  ingredients,
  categories,
  units,
  ingredientLists,
  ingredientFormDependencies,
  isAdmin = false,
}: GroceriesEditListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Keep ingredients local so inline create/edit updates are immediately selectable.
  const [localIngredients, setLocalIngredients] =
    useState<GroceriesEditIngredientOption[]>(ingredients);
  const [createIngredientState, setCreateIngredientState] = useState<{
    rowId: string;
    initialName: string;
  } | null>(null);
  const [editIngredientState, setEditIngredientState] = useState<{
    ingredientId: string;
    targetRowId?: string;
    source?: "row" | "quick-add";
  } | null>(null);
  const [quickAddPreferredUnitId, setQuickAddPreferredUnitId] = useState<string | null>(
    null,
  );
  const [initialRows, setInitialRows] = useState<GroceriesEditableRow[]>(() =>
    toEditableRows(list),
  );
  const [rows, setRows] = useState<GroceriesEditableRow[]>(() => toEditableRows(list));
  const sectionElementByCategoryIdRef = useRef(new Map<string, HTMLElement>());
  // Per-row DOM ref map. Mirrors the section ref pattern above so library
  // "+" can scrollIntoView a specific row regardless of which section it's in.
  const rowElementByRowIdRef = useRef(new Map<string, HTMLElement>());
  // Holds the most recently-added row id that should briefly show a ring.
  // Cleared by a setTimeout below so the highlight is genuinely transient.
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [focusAmountRowId, setFocusAmountRowId] = useState<string | null>(null);
  const [openIngredientSelectorRowId, setOpenIngredientSelectorRowId] = useState<
    string | null
  >(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const [optimisticCategoryId, setOptimisticCategoryId] = useState<string | null>(null);
  const categoryOrderIds = useMemo(
    () => list.effectiveCategoryOrderIds ?? categories.map((category) => category.id),
    [categories, list.effectiveCategoryOrderIds],
  );

  const ingredientById = useMemo(
    () =>
      new Map(localIngredients.map((ingredient) => [ingredient.id, ingredient] as const)),
    [localIngredients],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit] as const)),
    [units],
  );

  const ingredientOptionsByCategoryId = useMemo(() => {
    const sourcesByCategoryId = new Map<string, IngredientSearchSelectSource[]>();

    for (const ingredient of localIngredients) {
      const bucket = sourcesByCategoryId.get(ingredient.category.id) ?? [];
      bucket.push({
        id: ingredient.id,
        slug: ingredient.slug,
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
  }, [localIngredients]);
  const ingredientByIdForSelect = useMemo(
    () =>
      buildIngredientSearchSourceMap(
        localIngredients.map((ingredient) => ({
          id: ingredient.id,
          slug: ingredient.slug,
          name: ingredient.name,
          brand: ingredient.brand,
          descriptor: ingredient.descriptor,
          icon: ingredient.icon,
        })),
      ),
    [localIngredients],
  );
  const renderIngredientDropdownLabel = useCallback(
    (option: SearchableSelectOption) =>
      renderIngredientSearchDropdownLabel(option, ingredientByIdForSelect, {
        linkable: false,
      }),
    [ingredientByIdForSelect],
  );
  const renderIngredientTriggerLabel = useCallback(
    (option: SearchableSelectOption) =>
      renderIngredientSearchTriggerLabel(option, ingredientByIdForSelect, {
        linkable: false,
      }),
    [ingredientByIdForSelect],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category] as const)),
    [categories],
  );
  const orderedCategories = useMemo(() => {
    const knownOrder = categoryOrderIds
      .map((categoryId) => categoriesById.get(categoryId))
      .filter((category): category is GroceriesEditCategoryOption => Boolean(category));
    const missingCategories = categories.filter(
      (category) => !knownOrder.some((ordered) => ordered.id === category.id),
    );
    return [...knownOrder, ...missingCategories];
  }, [categories, categoriesById, categoryOrderIds]);

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
    return orderedCategories.map((category) => ({
      categoryId: category.id,
      title: category.name,
      rows: rowsByCategory.get(category.id) ?? [],
    }));
  }, [orderedCategories, rows]);
  const sectionRowCountByCategoryId = useMemo(
    () =>
      new Map(
        groupedSections.map((section) => [section.categoryId, section.rows.length] as const),
      ),
    [groupedSections],
  );
  const rowIndexById = useMemo(
    () =>
      new Map(
        rows.map((row, index) => [row.id, index] as const),
      ),
    [rows],
  );

  const hasUnsavedChanges = useMemo(
    () => hasGroceriesEditChanges(initialRows, rows),
    [initialRows, rows],
  );
  const isSaveDisabled = isPending || !hasUnsavedChanges;
  const onRowChange = useCallback(
    (rowId: string, next: Partial<GroceriesEditableRow>) => {
      const rowIndex = rowIndexById.get(rowId);
      if (rowIndex === undefined) return;
      setRows((prev) => {
        const existingRow = prev[rowIndex];
        if (!existingRow) return prev;
        const updatedRow = { ...existingRow, ...next };
        // Skip state writes when nothing changed to avoid extra rerenders.
        const hasAnyChange = Object.entries(next).some(
          ([key, value]) =>
            existingRow[key as keyof GroceriesEditableRow] !== value,
        );
        if (!hasAnyChange) return prev;
        const nextRows = [...prev];
        nextRows[rowIndex] = updatedRow;
        return nextRows;
      });
    },
    [rowIndexById],
  );
  const onRowRemove = useCallback((rowId: string) => {
    // Row removal is centralized with row updates to keep section components stateless.
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);
  const onAddRow = useCallback((categoryId: string) => {
    const newRowId = crypto.randomUUID();
    // New rows live entirely in form state until save; they get a temp UUID as
    // an id (used as React key + sent through to the action) and isNew:true so
    // the action layer routes them to create instead of update.
    setRows((prev) => [
      ...prev,
      {
        id: newRowId,
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
    // Wait one frame so the row is mounted before scroll + ingredient search open.
    requestAnimationFrame(() => {
      const element = rowElementByRowIdRef.current.get(newRowId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setOpenIngredientSelectorRowId(newRowId);
    });
  }, []);
  const setSectionElement = useCallback((categoryId: string, node: HTMLElement | null) => {
    if (node) {
      sectionElementByCategoryIdRef.current.set(categoryId, node);
      return;
    }
    sectionElementByCategoryIdRef.current.delete(categoryId);
  }, []);
  // Per-row registration callback handed down through CategorySection -> Row.
  const registerRowRef = useCallback((rowId: string, node: HTMLElement | null) => {
    if (node) {
      rowElementByRowIdRef.current.set(rowId, node);
      return;
    }
    rowElementByRowIdRef.current.delete(rowId);
  }, []);

  // Scroll the row into view, then briefly highlight it. Hoisted into a
  // helper so both the duplicate-detected and freshly-added paths share the
  // same UX.
  const scrollAndHighlightRow = useCallback((rowId: string) => {
    const element = rowElementByRowIdRef.current.get(rowId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightedRowId(rowId);
    setFocusAmountRowId(rowId);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedRowId((current) => (current === rowId ? null : current));
      highlightTimeoutRef.current = null;
    }, ROW_HIGHLIGHT_DURATION_MS);
  }, []);

  const onAmountFocusHandled = useCallback(() => {
    setFocusAmountRowId(null);
  }, []);

  const onIngredientSelectorOpenHandled = useCallback(() => {
    setOpenIngredientSelectorRowId(null);
  }, []);

  // Shared add path for library "+" and Quick add search. Duplicates always
  // scroll to the existing row; new rows optionally scroll (library) or stay
  // put (Quick add batch flow).
  const addIngredientToGroceries = useCallback(
    (
      ingredientId: string,
      options: { scrollOnNewAdd: boolean; draft?: QuickAddRowDraft },
    ): boolean => {
      const result = resolveAddIngredientToGroceries({
        ingredientId,
        rows,
        ingredient: ingredientById.get(ingredientId),
        createRowId: () => crypto.randomUUID(),
        draft: options.draft,
      });

      if (result.type === "not_found") {
        return false;
      }

      if (result.type === "added") {
        setRows((prev) => [...prev, result.newRow]);
      }

      if (shouldScrollAfterIngredientAdd(result, options.scrollOnNewAdd)) {
        const rowIdToScroll =
          result.type === "duplicate" ? result.existingRowId : result.newRow.id;
        // Wait one frame so the new row is mounted and registered before we
        // try to scroll to it; rAF beats setTimeout(0) here for layout stability.
        requestAnimationFrame(() => scrollAndHighlightRow(rowIdToScroll));
      }

      return result.type === "added";
    },
    [ingredientById, rows, scrollAndHighlightRow],
  );

  const onAddIngredientFromLibrary = useCallback(
    (ingredientId: string) => {
      addIngredientToGroceries(ingredientId, { scrollOnNewAdd: true });
    },
    [addIngredientToGroceries],
  );

  const onAddItemFromQuickAdd = useCallback(
    (draft: QuickAddDraft): boolean => {
      if (!draft.ingredientId) return false;
      return addIngredientToGroceries(draft.ingredientId, {
        scrollOnNewAdd: false,
        draft: {
          amount: draft.amount,
          unitId: draft.unitId,
          additionalInfo: draft.additionalInfo,
          substitutionNote: draft.substitutionNote,
        },
      });
    },
    [addIngredientToGroceries],
  );

  // Clear any pending highlight timeout when the component unmounts so we
  // don't update state on a stale tree.
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Sync local ingredient options when server-provided ingredients change.
  useEffect(() => {
    setLocalIngredients(ingredients);
  }, [ingredients]);

  const onCreateIngredientRequested = useCallback(
    (rowId: string, initialName: string) => {
      setCreateIngredientState({ rowId, initialName });
    },
    [],
  );

  const onEditIngredientRequested = useCallback(
    (ingredientId: string, context?: { targetRowId?: string; source?: "row" | "quick-add" }) => {
      setEditIngredientState({
        ingredientId,
        targetRowId: context?.targetRowId,
        source: context?.source,
      });
    },
    [],
  );

  const handleIngredientCreated = useCallback(
    (createdIngredient: IngredientType) => {
      setLocalIngredients((prev) => {
        if (prev.some((ingredient) => ingredient.id === createdIngredient.id)) {
          return prev;
        }
        return [...prev, createdIngredient as GroceriesEditIngredientOption].sort(
          (a, b) => a.name.localeCompare(b.name),
        );
      });

      if (!createIngredientState) {
        return;
      }

      const { rowId } = createIngredientState;
      setRows((prev) => {
        const rowIndex = prev.findIndex((row) => row.id === rowId);
        if (rowIndex === -1) {
          return prev;
        }

        const existingRow = prev[rowIndex];
        const allowedUnitIds = new Set(
          createdIngredient.unitConversions.map((conversion) => conversion.unitId),
        );
        const linkUpdate: Partial<GroceriesEditableRow> = {
          ingredientId: createdIngredient.id,
          displayLabel: createdIngredient.name,
          ...getGroceryNotesFromIngredient(createdIngredient),
        };
        linkUpdate.substitutionsAllowed = deriveSubstitutionsAllowed(
          linkUpdate.substitutionNote ?? null,
        );
        // Clear ad-hoc unit when it is not valid for the newly linked ingredient.
        if (existingRow.unitId != null && !allowedUnitIds.has(existingRow.unitId)) {
          linkUpdate.unitId = null;
        }

        const nextRows = [...prev];
        nextRows[rowIndex] = { ...existingRow, ...linkUpdate };
        return nextRows;
      });
      setCreateIngredientState(null);
    },
    [createIngredientState],
  );

  const handleIngredientUpdated = useCallback(
    (updatedIngredient: IngredientType) => {
      const previousIngredient = localIngredients.find(
        (ingredient) => ingredient.id === updatedIngredient.id,
      );
      const editContext = editIngredientState;

      setLocalIngredients((prev) =>
        prev.map((ingredient) =>
          ingredient.id === updatedIngredient.id
            ? (updatedIngredient as GroceriesEditIngredientOption)
            : ingredient,
        ),
      );

      setRows((prev) => {
        const { rows: reconciledRows, fixedRowsCount, newlyAddedUnitId } =
          reconcileGroceryRowUnitsAfterIngredientUpdate({
            rows: prev,
            updatedIngredient,
            previousIngredient,
            targetRowId: editContext?.targetRowId,
          });
        if (fixedRowsCount > 0) {
          toast.info(
            `Updated ingredient changed available units. Auto-adjusted ${fixedRowsCount} row${fixedRowsCount > 1 ? "s" : ""}.`,
          );
        }
        if (editContext?.source === "quick-add" && newlyAddedUnitId) {
          setQuickAddPreferredUnitId(newlyAddedUnitId);
        }
        return reconciledRows;
      });

      setEditIngredientState(null);
    },
    [editIngredientState, localIngredients],
  );
  const onCategoryBadgeClick = useCallback((categoryId: string) => {
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

  const planDateRangeLabel = formatDateRangeLabel(
    new Date(list.plan.startDate),
    new Date(list.plan.endDate),
  );

  const topbarConfig = useMemo(
    () => ({
      breadcrumbs: [
        { label: "Groceries", href: ROUTES.groceriesCurrent },
        {
          label: planDateRangeLabel,
          href: ROUTES.groceriesView(list.plan.id),
        },
        { label: "Edit groceries" },
      ],
      actions: [
        {
          id: "cancel-groceries-edit",
          label: "Cancel",
          href: ROUTES.groceriesView(list.plan.id),
          variant: "outline" as const,
          size: "default" as const,
          ariaLabel: "Cancel editing and view grocery list",
        },
        {
          id: "save-groceries",
          label: isPending ? "Saving groceries..." : "Save groceries",
          onClick: () => {
            startTransition(async () => {
              const result = await saveShoppingListEditsAction({
                planId: list.plan.id,
                deletedItemIds: getDeletedPersistedItemIds(initialRows, rows),
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
    [initialRows, isPending, isSaveDisabled, list.plan.id, planDateRangeLabel, router, rows, startTransition],
  );

  return (
    // Keep the edit surface stretched so both main content and right panel can use page width.
    <div className="w-full space-y-8">
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

      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <GroceriesEditQuickAddSection
            ingredients={localIngredients}
            ingredientById={ingredientById}
            unitById={unitById}
            renderIngredientDropdownLabel={renderIngredientDropdownLabel}
            renderIngredientTriggerLabel={renderIngredientTriggerLabel}
            onAddItem={onAddItemFromQuickAdd}
            onEditIngredientRequested={onEditIngredientRequested}
            preferredUnitId={quickAddPreferredUnitId}
            onPreferredUnitIdApplied={() => setQuickAddPreferredUnitId(null)}
          />
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
              // Row updates are centralized here so section components stay stateless.
              onRowChange={onRowChange}
              onRowRemove={onRowRemove}
              onAddRow={onAddRow}
              onCreateIngredientRequested={onCreateIngredientRequested}
              onEditIngredientRequested={onEditIngredientRequested}
              registerRowRef={registerRowRef}
              highlightedRowId={highlightedRowId}
              focusAmountRowId={focusAmountRowId}
              onAmountFocusHandled={onAmountFocusHandled}
              openIngredientSelectorRowId={openIngredientSelectorRowId}
              onIngredientSelectorOpenHandled={onIngredientSelectorOpenHandled}
            />
          ))}
        </div>

        {/* Spacer matches category section heading + gap so the library aligns with rows. */}
        <div className="hidden lg:flex lg:flex-col">
          <div aria-hidden className="h-7 shrink-0" />
          <GroceriesEditLibraryPanel
            planId={list.plan.id}
            lists={ingredientLists}
            ingredients={localIngredients}
            categories={categories}
            onAddIngredientToGroceries={onAddIngredientFromLibrary}
            onEditIngredientRequested={onEditIngredientRequested}
          />
        </div>
      </div>

      <CreateIngredientDialog
        open={Boolean(createIngredientState)}
        initialName={createIngredientState?.initialName}
        onOpenChange={(open) => {
          if (!open) {
            setCreateIngredientState(null);
          }
        }}
        onCreated={handleIngredientCreated}
        isAdmin={isAdmin}
        categories={ingredientFormDependencies.categories}
        units={ingredientFormDependencies.units}
        gramsUnitId={ingredientFormDependencies.gramsUnitId}
        iconOptions={ingredientFormDependencies.iconOptions}
      />

      <EditIngredientDialog
        open={Boolean(editIngredientState)}
        ingredient={
          editIngredientState
            ? localIngredients.find(
                (ingredient) => ingredient.id === editIngredientState.ingredientId,
              )
            : undefined
        }
        onOpenChange={(open) => {
          if (!open) {
            setEditIngredientState(null);
          }
        }}
        onUpdated={handleIngredientUpdated}
        categories={ingredientFormDependencies.categories}
        units={ingredientFormDependencies.units}
        gramsUnitId={ingredientFormDependencies.gramsUnitId}
        iconOptions={ingredientFormDependencies.iconOptions}
        isAdmin={isAdmin}
      />
    </div>
  );
}
