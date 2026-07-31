"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  EditableIngredientRow,
  LogIngredientOption,
} from "@/components/log/log-ingredients-form";
import type {
  PlanCustomMealIngredient,
  PlanSlotMealPayload,
} from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getMealChangeSummary } from "@/lib/planner/plan-slot-meal-dialog-copy";
import { getPlannerMealCount } from "@/lib/planner/helpers";
import { PlanSlotRecipePicker } from "./plan-slot-recipe-picker";
import { PlanSlotCustomMealForm } from "./plan-slot-custom-meal-form";
import { PlanSlotWhoEats } from "./plan-slot-who-eats";
import {
  PlanSlotIngredientsPanel,
  toRowKey,
  type DialogIngredientRow,
} from "./plan-slot-ingredients-panel";

export type MealDialogTab = "repository" | "custom";

export type PlanSlotMealFormProps = {
  title: string;
  subtitle: string;
  saveLabel?: string;
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  initialRecipeId: string | null;
  initialCustomName: string;
  initialRows: EditableIngredientRow[];
  /** Defaulted audience ids (empty slot → all members). */
  cookingFamilyMemberIds?: string[];
  familyMembers?: FamilyMemberRow[];
  /** Which tab to open on. */
  defaultTab?: MealDialogTab;
  /** Occasion slug to pre-filter the repository picker. */
  initialOccasionSlug?: string | null;
  /**
   * Live "N of M" when the current slot is part of a batch group.
   * Used for the ingredients panel badge and per-day amount scaling.
   */
  batchLabel?: { index: number; total: number } | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (payload: PlanSlotMealPayload) => Promise<void>;
};

function toComparableRows(rows: EditableIngredientRow[]) {
  return rows.map((row) => ({
    ingredientId: row.ingredientId,
    unitId: row.unitId,
    amount: row.amount,
  }));
}

function toCustomIngredients(
  rows: EditableIngredientRow[],
): PlanCustomMealIngredient[] {
  return rows
    .filter(
      (row): row is { ingredientId: string; unitId: string; amount: number } =>
        row.ingredientId != null &&
        row.unitId != null &&
        row.amount != null &&
        row.amount > 0,
    )
    .map((row) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      amount: row.amount,
    }));
}

function arraysEqualAsSets(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

export function PlanSlotMealForm({
  title,
  subtitle,
  saveLabel = "Save meal",
  recipes,
  ingredientOptions,
  initialRecipeId,
  initialCustomName,
  initialRows,
  cookingFamilyMemberIds = [],
  familyMembers = [],
  defaultTab = "repository",
  initialOccasionSlug = null,
  batchLabel = null,
  isSaving,
  onCancel,
  onSave,
}: PlanSlotMealFormProps) {
  const [activeTab, setActiveTab] = useState<MealDialogTab>(defaultTab);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    initialRecipeId,
  );
  const [customName, setCustomName] = useState(initialCustomName);
  const [rows, setRows] = useState<DialogIngredientRow[]>(() =>
    initialRows.map((row) => ({
      ...row,
      key: toRowKey(),
    })),
  );
  const [audienceIds, setAudienceIds] = useState<string[]>(
    cookingFamilyMemberIds,
  );

  // Initial state is seeded from props. Remount via `key` on PlanSlotMealForm
  // (see PlanSlotMealDialog) when the slot/initials change — no sync effect.

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId],
  );

  // Batch badge + per-day scaling: ingredients are one meal's share, so the
  // badge always reads "1 of X" (X = meals in this plan batch, or recipe default).
  const displayBatchLabel = useMemo(() => {
    if (!selectedRecipe?.isBatchRecipe) return null;

    if (
      selectedRecipe.id === initialRecipeId &&
      batchLabel != null &&
      batchLabel.total >= 2
    ) {
      return { index: 1, total: batchLabel.total };
    }

    const total = getPlannerMealCount(selectedRecipe);
    if (total < 2) return null;
    return { index: 1, total };
  }, [batchLabel, initialRecipeId, selectedRecipe]);

  const initialRecipeName = useMemo(() => {
    if (!initialRecipeId) return initialCustomName.trim() || null;
    return (
      recipes.find((recipe) => recipe.id === initialRecipeId)?.name ?? null
    );
  }, [initialCustomName, initialRecipeId, recipes]);

  const pendingMealName = useMemo(() => {
    if (activeTab === "repository") {
      return selectedRecipe?.name ?? null;
    }
    return customName.trim() || null;
  }, [activeTab, customName, selectedRecipe]);

  const audienceChanged = !arraysEqualAsSets(
    audienceIds,
    cookingFamilyMemberIds,
  );

  const hasUnsavedChanges = useMemo(() => {
    const normalizedCurrent = toComparableRows(rows);
    const normalizedInitial = toComparableRows(initialRows);
    const rowsChanged =
      JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedInitial);
    const recipeChanged = selectedRecipeId !== initialRecipeId;
    const nameChanged = customName.trim() !== initialCustomName.trim();
    const tabImpliesCustom = activeTab === "custom";
    const startedAsCustom = initialRecipeId == null && initialCustomName.trim().length > 0;
    const startedAsRecipe = initialRecipeId != null;
    const startedEmpty = !startedAsCustom && !startedAsRecipe;

    if (tabImpliesCustom) {
      return (
        nameChanged ||
        rowsChanged ||
        audienceChanged ||
        startedAsRecipe ||
        (startedEmpty && customName.trim().length > 0)
      );
    }

    return (
      recipeChanged ||
      audienceChanged ||
      startedAsCustom ||
      (startedEmpty && selectedRecipeId != null)
    );
  }, [
    activeTab,
    audienceChanged,
    customName,
    initialCustomName,
    initialRecipeId,
    initialRows,
    rows,
    selectedRecipeId,
  ]);

  const changeSummary = getMealChangeSummary({
    fromName: initialRecipeName,
    toName: pendingMealName,
  });

  const canSave =
    hasUnsavedChanges &&
    (activeTab === "repository"
      ? selectedRecipeId != null
      : customName.trim().length > 0);

  const ingredientsMode =
    activeTab === "custom"
      ? "custom"
      : selectedRecipe
        ? "recipe"
        : "empty";

  const handleSelectRecipe = (recipe: RecipeType) => {
    setSelectedRecipeId(recipe.id);
  };

  const handleSave = async () => {
    if (activeTab === "repository") {
      if (!selectedRecipe) {
        toast.error("Select a recipe");
        return;
      }

      await onSave({
        kind: "recipe",
        recipe: selectedRecipe,
        cookingFamilyMemberIds: audienceIds,
      });
      return;
    }

    const trimmedName = customName.trim();
    if (!trimmedName) {
      toast.error("Enter a meal name");
      return;
    }

    const normalizedRows = rows.map((row) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      amount: row.amount,
    }));

    const hasPartialRow = normalizedRows.some((row) => {
      const hasAny =
        row.ingredientId != null || row.unitId != null || row.amount != null;
      const hasAll =
        row.ingredientId != null &&
        row.unitId != null &&
        row.amount != null &&
        row.amount > 0;
      return hasAny && !hasAll;
    });

    if (hasPartialRow) {
      toast.error(
        "Each ingredient row must have ingredient, unit and positive amount",
      );
      return;
    }

    await onSave({
      kind: "custom",
      name: trimmedName,
      ingredients: toCustomIngredients(normalizedRows),
      cookingFamilyMemberIds: audienceIds,
    });
  };

  const whoEats = (
    <PlanSlotWhoEats
      familyMembers={familyMembers}
      value={audienceIds}
      onChange={setAudienceIds}
    />
  );

  const ingredientsPanelProps = {
    mode: ingredientsMode as "recipe" | "custom" | "empty",
    recipe: selectedRecipe,
    cookingFamilyMemberIds: audienceIds,
    familyMembers,
    ingredientOptions,
    rows,
    onRowsChange: setRows,
    batchLabel: displayBatchLabel,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-4 text-left md:px-6 md:py-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "repository" || value === "custom") {
            setActiveTab(value);
          }
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        {/*
          Layout:
          - Desktop (lg+): two columns — left = tabs + picker, right = cooking for + ingredients.
          - Mobile (<lg): single scroll — cooking for above grid, ingredients collapsible above footer.
        */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* LEFT / PRIMARY COLUMN */}
          <div className="flex min-h-0 flex-1 flex-col lg:w-[58%] lg:shrink-0">
            <div className="shrink-0 space-y-3 border-b px-4 py-3 md:px-6">
              <TabsList className="h-10 w-full gap-[2px] shadow-xs">
                <TabsTrigger value="repository" className="flex-1">
                  From my recipes
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  Custom meal
                </TabsTrigger>
              </TabsList>

              {/* Mobile: Cooking for above the grid so it stays visible. */}
              <div className="lg:hidden">{whoEats}</div>
            </div>

            <TabsContent
              value="repository"
              className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
            >
              <PlanSlotRecipePicker
                key={`picker-${initialOccasionSlug ?? "all"}-${initialRecipeId ?? "new"}`}
                recipes={recipes}
                selectedRecipeId={selectedRecipeId}
                initialOccasionSlug={initialOccasionSlug}
                onSelectRecipe={handleSelectRecipe}
              />
            </TabsContent>

            <TabsContent
              value="custom"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto data-[state=inactive]:hidden"
            >
              <PlanSlotCustomMealForm
                customName={customName}
                onCustomNameChange={setCustomName}
              />
              {/* Mobile custom: editable ingredients live in the collapsible below. */}
            </TabsContent>
          </div>

          {/* RIGHT COLUMN — desktop only */}
          <div className="hidden min-h-0 flex-col overflow-y-auto border-l px-4 py-4 md:px-6 md:py-5 lg:flex lg:flex-1">
            <div className="space-y-6">
              {whoEats}
              <PlanSlotIngredientsPanel {...ingredientsPanelProps} />
            </div>
          </div>
        </div>

        {/* Mobile: ingredient list collapses above the footer. */}
        <div className="shrink-0 lg:hidden">
          <PlanSlotIngredientsPanel
            {...ingredientsPanelProps}
            collapsibleOnMobile
          />
        </div>
      </Tabs>

      <DialogFooter className="shrink-0 flex-col items-stretch gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        {/* Recipe-only change summary — darker than muted so it stays readable. */}
        <p className="text-sm text-foreground sm:mr-auto">
          {changeSummary ?? "\u00a0"}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !canSave}
          >
            {isSaving ? "Saving..." : saveLabel}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}
