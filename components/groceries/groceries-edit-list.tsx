"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  saveShoppingLayoutPresetAction,
  saveShoppingListEditsAction,
  setShoppingLayoutPresetAction,
} from "@/actions/shopping-list-actions";
import { GroceriesEditCategorySection } from "@/components/groceries/groceries-edit-category-section";
import { GroceriesLayoutSelector } from "@/components/groceries/groceries-layout-selector";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  type IngredientSearchSelectSource,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

function moveCategoryIdToIndex(input: {
  categoryIds: string[];
  movedCategoryId: string;
  targetIndex: number;
}) {
  const sourceIndex = input.categoryIds.indexOf(input.movedCategoryId);
  if (sourceIndex < 0) return input.categoryIds;
  const next = [...input.categoryIds];
  const [moved] = next.splice(sourceIndex, 1);
  const boundedTarget = Math.max(0, Math.min(input.targetIndex, next.length));
  next.splice(boundedTarget, 0, moved);
  return next;
}

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
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>(
    () => list.effectiveCategoryOrderIds ?? categories.map((category) => category.id),
  );
  const [activeLayoutPresetId, setActiveLayoutPresetId] = useState<string | null>(
    list.activeLayoutPresetId,
  );
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSavePresetDialogOpen, setIsSavePresetDialogOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState("");

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
    if (isReorderMode) return;
    // Optimistically mark the clicked section active before scroll settles.
    setOptimisticCategoryId(categoryId);
    const sectionElement = sectionElementByCategoryIdRef.current.get(categoryId);
    if (!sectionElement) return;
    sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isReorderMode]);
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
    // Keep local category order synced with persisted active preset after refresh/navigation.
    setCategoryOrderIds(list.effectiveCategoryOrderIds ?? categories.map((category) => category.id));
    setActiveLayoutPresetId(list.activeLayoutPresetId);
  }, [categories, list.activeLayoutPresetId, list.effectiveCategoryOrderIds]);
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
  const orderedCategoryIdsForSave = useMemo(
    () => groupedSections.map((section) => section.categoryId),
    [groupedSections],
  );
  const onLayoutPresetSelect = useCallback(
    (presetId: string) => {
      const selectedPreset = list.layoutPresets.find((preset) => preset.id === presetId);
      if (!selectedPreset) return;
      // Optimistically switch both selector state and rendered order.
      setActiveLayoutPresetId(presetId);
      setCategoryOrderIds(selectedPreset.categoryOrderIds);
      startTransition(async () => {
        const result = await setShoppingLayoutPresetAction({
          planId: list.plan.id,
          presetId,
        });
        if (result.type === "error") {
          toast.error(result.message);
          return;
        }
        router.refresh();
      });
    },
    [list.layoutPresets, list.plan.id, router, startTransition],
  );
  const onSaveAsPreset = useCallback(
    async (presetNameRaw: string) => {
      const presetName = presetNameRaw.trim();
      if (!presetName) {
        toast.error("Preset name cannot be empty.");
        return;
      }
      const result = await saveShoppingLayoutPresetAction({
        planId: list.plan.id,
        presetName,
        orderedCategoryIds: orderedCategoryIdsForSave,
      });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`Saved "${presetName}" layout preset.`);
      setIsSavePresetDialogOpen(false);
      setPresetNameInput("");
      router.refresh();
    },
    [list.plan.id, orderedCategoryIdsForSave, router],
  );
  const onSavePresetDialogConfirm = useCallback(() => {
    const presetName = presetNameInput.trim();
    if (!presetName) {
      toast.error("Preset name cannot be empty.");
      return;
    }
    startTransition(async () => {
      await onSaveAsPreset(presetName);
    });
  }, [onSaveAsPreset, presetNameInput, startTransition]);

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
                  "transition-colors focus-visible:outline-none",
                  isReorderMode
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-pointer",
                  draggingCategoryId === section.categoryId && "opacity-60",
                )}
                draggable={isReorderMode}
                aria-pressed={isActive}
                onClick={() => onCategoryBadgeClick(section.categoryId)}
                onDragStart={() => {
                  if (!isReorderMode) return;
                  setDraggingCategoryId(section.categoryId);
                }}
                onDragEnd={() => {
                  if (!isReorderMode) return;
                  setDraggingCategoryId(null);
                }}
                onDragOver={(event) => {
                  if (!isReorderMode) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!isReorderMode) return;
                  event.preventDefault();
                  if (!draggingCategoryId || draggingCategoryId === section.categoryId) return;
                  const dropIndex = groupedSections.findIndex(
                    (candidate) => candidate.categoryId === section.categoryId,
                  );
                  setCategoryOrderIds((prev) =>
                    moveCategoryIdToIndex({
                      categoryIds: prev,
                      movedCategoryId: draggingCategoryId,
                      targetIndex: dropIndex,
                    }),
                  );
                  setDraggingCategoryId(null);
                }}
              >
                {isReorderMode ? (
                  <GripVertical className="h-3.5 w-3.5 opacity-70" aria-hidden />
                ) : null}
                {section.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keep controls below sticky badges and above category list content. */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="groceries-layout-selector">Supermarket layout</Label>
            <GroceriesLayoutSelector
              presets={list.layoutPresets.map((preset) => ({
                id: preset.id,
                name: preset.name,
              }))}
              value={activeLayoutPresetId}
              onValueChange={onLayoutPresetSelect}
              disabled={isPending || list.layoutPresets.length === 0}
              triggerClassName="w-[220px]"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSavePresetDialogOpen(true)}
            disabled={isPending}
          >
            Save as preset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsReorderMode((prev) => !prev)}
            disabled={isPending}
          >
            {isReorderMode ? "Done reordering" : "Reorder layout"}
          </Button>
        </div>
      </section>

      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
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

      <Dialog open={isSavePresetDialogOpen} onOpenChange={setIsSavePresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save supermarket layout preset</DialogTitle>
            <DialogDescription>
              Save the current category order as a reusable supermarket layout preset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preset-name-input">Preset name</Label>
            <Input
              id="preset-name-input"
              value={presetNameInput}
              onChange={(event) => setPresetNameInput(event.target.value)}
              placeholder="e.g. Lidl Layout"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onSavePresetDialogConfirm();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSavePresetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onSavePresetDialogConfirm} disabled={isPending}>
              Save preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
