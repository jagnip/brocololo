"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  renderIngredientSearchDropdownLabel,
  renderIngredientSearchTriggerLabel,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import type {
  EditableIngredientRow,
  LogIngredientOption,
} from "@/components/log/log-ingredients-form";
import type { PlanCustomMealIngredient, PlanSlotMealPayload } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import { cn } from "@/lib/utils";
import {
  getPlannerRecipeDialogIngredientRows,
  type FamilyMemberRef,
} from "@/lib/planner/resolve-slot-ingredients";

type DialogRow = EditableIngredientRow & { key: string };

export type PlanSlotMealFormProps = {
  title: string;
  subtitle: string;
  saveLabel?: string;
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  initialRecipeId: string | null;
  initialCustomName: string;
  initialRows: EditableIngredientRow[];
  cookingFamilyMemberIds?: string[];
  familyMembers?: FamilyMemberRef[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: (payload: PlanSlotMealPayload) => Promise<void>;
};

function toRowKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `row-${Math.random().toString(36).slice(2)}`;
}

function getMacrosFromRows(
  rows: EditableIngredientRow[],
  ingredientOptions: LogIngredientOption[],
) {
  let calories = 0;
  let proteins = 0;
  let fats = 0;
  let carbs = 0;

  const ingredientById = new Map(
    ingredientOptions.map((option) => [option.id, option]),
  );

  for (const row of rows) {
    if (!row.ingredientId || !row.unitId || row.amount == null) {
      continue;
    }

    const ingredient = ingredientById.get(row.ingredientId);
    if (!ingredient) {
      continue;
    }

    const conversion = ingredient.unitConversions.find(
      (item) => item.unitId === row.unitId,
    );
    if (!conversion) {
      continue;
    }

    const grams = row.amount * conversion.gramsPerUnit;
    const multiplier = grams / 100;
    calories += ingredient.calories * multiplier;
    proteins += ingredient.proteins * multiplier;
    fats += ingredient.fats * multiplier;
    carbs += ingredient.carbs * multiplier;
  }

  const round1 = (value: number) => Math.round(value * 10) / 10;
  return {
    calories: round1(calories),
    proteins: round1(proteins),
    fats: round1(fats),
    carbs: round1(carbs),
  };
}

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
  isSaving,
  onCancel,
  onSave,
}: PlanSlotMealFormProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    initialRecipeId,
  );
  const [customName, setCustomName] = useState(initialCustomName);
  const [rows, setRows] = useState<DialogRow[]>(() =>
    initialRows.map((row) => ({
      ...row,
      key: toRowKey(),
    })),
  );

  useEffect(() => {
    setSelectedRecipeId(initialRecipeId);
    setCustomName(initialCustomName);
    setRows(
      initialRows.map((row) => ({
        ...row,
        key: toRowKey(),
      })),
    );
  }, [initialCustomName, initialRecipeId, initialRows]);

  const ingredientById = useMemo(
    () =>
      new Map(
        ingredientOptions.map((ingredient) => [ingredient.id, ingredient]),
      ),
    [ingredientOptions],
  );

  const macros = useMemo(
    () => getMacrosFromRows(rows, ingredientOptions),
    [ingredientOptions, rows],
  );

  const ingredientSelectSources = useMemo(
    () =>
      ingredientOptions.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        brand: ingredient.brand,
        descriptor: ingredient.descriptor,
        category: ingredient.category ?? null,
      })),
    [ingredientOptions],
  );

  const ingredientByIdForSelect = useMemo(
    () => buildIngredientSearchSourceMap(ingredientSelectSources),
    [ingredientSelectSources],
  );

  const ingredientSelectOptions = useMemo(
    () => ingredientsToSearchableSelectOptions(ingredientSelectSources),
    [ingredientSelectSources],
  );

  const renderIngredientDropdownLabel = useCallback(
    (option: SearchableSelectOption) =>
      renderIngredientSearchDropdownLabel(option, ingredientByIdForSelect),
    [ingredientByIdForSelect],
  );

  const renderIngredientTriggerLabel = useCallback(
    (option: SearchableSelectOption) =>
      renderIngredientSearchTriggerLabel(option, ingredientByIdForSelect),
    [ingredientByIdForSelect],
  );

  const isCustomMode = selectedRecipeId == null;

  const hasUnsavedChanges = useMemo(() => {
    const normalizedCurrent = toComparableRows(rows);
    const normalizedInitial = toComparableRows(initialRows);
    const rowsChanged =
      JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedInitial);
    const recipeChanged = selectedRecipeId !== initialRecipeId;
    const nameChanged = customName.trim() !== initialCustomName.trim();
    return rowsChanged || recipeChanged || nameChanged;
  }, [
    customName,
    initialCustomName,
    initialRecipeId,
    initialRows,
    rows,
    selectedRecipeId,
  ]);

  const handleCustomNameChange = (nextName: string) => {
    setCustomName(nextName);
    // Switch to custom mode but keep any ingredient rows (e.g. prefilled from a recipe).
    if (nextName.trim().length > 0 && selectedRecipeId != null) {
      setSelectedRecipeId(null);
    }
  };

  const handleRecipeChange = (nextRecipeId: string | null) => {
    setSelectedRecipeId(nextRecipeId);
    if (!nextRecipeId) {
      setRows([]);
      return;
    }

    const recipe = recipes.find((item) => item.id === nextRecipeId);
    if (!recipe) {
      setRows([]);
      return;
    }

    setCustomName("");
    // Person-aware prefill: aggregated amounts for the slot's cooking audience.
    const resolvedRows = getPlannerRecipeDialogIngredientRows({
      recipe,
      cookingFamilyMemberIds,
      familyMembers,
    });
    setRows(
      resolvedRows.map((row) => ({
        key: toRowKey(),
        ingredientId: row.ingredientId,
        unitId: row.unitId,
        amount: row.amount,
      })),
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: toRowKey(),
        ingredientId: null,
        unitId: null,
        amount: null,
      },
    ]);
  };

  const handleRemoveRow = (rowKey: string) => {
    setRows((prev) => prev.filter((row) => row.key !== rowKey));
  };

  const handleSave = async () => {
    if (selectedRecipeId) {
      const recipe = recipes.find((item) => item.id === selectedRecipeId);
      if (!recipe) {
        toast.error("Selected recipe was not found");
        return;
      }

      await onSave({ kind: "recipe", recipe });
      return;
    }

    const trimmedName = customName.trim();
    if (!trimmedName) {
      toast.error("Enter a meal name or select a recipe");
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
      toast.error("Each ingredient row must have ingredient, unit and positive amount");
      return;
    }

    await onSave({
      kind: "custom",
      name: trimmedName,
      ingredients: toCustomIngredients(normalizedRows),
    });
  };

  const canSave =
    hasUnsavedChanges &&
    (selectedRecipeId != null || customName.trim().length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-4 text-left md:px-6 md:py-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Recipe or custom name — compact field widths match planner selects (max-w-md). */}
        <div className="border-b px-4 py-4 text-left md:px-6 md:py-6">
          <div className="flex w-full max-w-md flex-col gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recipe
              </p>
              <SearchableSelect
                options={recipes.map((recipe) => ({
                  value: recipe.id,
                  label: recipe.name,
                }))}
                value={selectedRecipeId}
                onValueChange={handleRecipeChange}
                placeholder="Select a recipe..."
                searchPlaceholder="Search recipe..."
                emptyLabel="No recipe found."
                allowClear
                clearLabel="Clear recipe"
              />
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom meal name
              </p>
              <Input
                value={customName}
                onChange={(event) => handleCustomNameChange(event.target.value)}
                placeholder="e.g. Pasta from Instagram"
              />
            </div>
          </div>
        </div>

        <section className="px-4 py-4 md:px-6 md:py-6 border-b">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{macros.calories.toFixed(0)} kcal</Badge>
            <Badge variant="default">
              {macros.proteins.toFixed(1)}g protein
            </Badge>
            <Badge variant="default">{macros.fats.toFixed(1)}g fat</Badge>
            <Badge variant="default">{macros.carbs.toFixed(1)}g carbs</Badge>
          </div>
        </section>

        <section
          className={cn(
            "flex flex-col px-4 py-4 md:px-6 md:py-6",
            rows.length > 0 && "gap-4",
          )}
        >
            {/* Recipe mode: amounts are computed from recipe + eaters — fields stay visible but locked. */}
            {!isCustomMode ? (
              <p className="text-sm text-muted-foreground">
                Amounts are calculated from the recipe and assigned eaters.
              </p>
            ) : null}

            {rows.length > 0 ? (
              <div className="space-y-2">
                {rows.map((row) => {
                  const selectedIngredient = row.ingredientId
                    ? ingredientById.get(row.ingredientId)
                    : null;
                  const availableUnits =
                    selectedIngredient?.unitConversions ?? [];
                  // Recipe-linked rows are read-only; custom meal rows stay editable.
                  const rowsDisabled = !isCustomMode;

                  return (
                    <div
                      key={row.key}
                      className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-md border border-border p-2 sm:rounded-none sm:border-0 sm:p-0 sm:gap-2 sm:grid-cols-[minmax(0,1fr)_96px_128px_auto] lg:grid-cols-[minmax(0,32rem)_96px_128px_auto]"
                    >
                      <div className="min-w-0 col-span-3 sm:col-span-1">
                        <SearchableSelect
                          className="min-w-0 w-full font-normal"
                          options={ingredientSelectOptions}
                          renderLabel={renderIngredientDropdownLabel}
                          renderTriggerLabel={renderIngredientTriggerLabel}
                          value={row.ingredientId}
                          disabled={rowsDisabled}
                          onValueChange={(nextValue) => {
                            if (!nextValue) {
                              setRows((prev) =>
                                prev.map((item) =>
                                  item.key === row.key
                                    ? {
                                        ...item,
                                        ingredientId: null,
                                        unitId: null,
                                        amount: null,
                                      }
                                    : item,
                                ),
                              );
                              return;
                            }

                            const ingredient = ingredientById.get(nextValue);
                            const defaultUnitId = ingredient
                              ? getDefaultUnitIdForIngredient({
                                  defaultUnitId: ingredient.defaultUnitId,
                                  unitConversions:
                                    ingredient.unitConversions.map(
                                      (conversion) => ({
                                        unitId: conversion.unitId,
                                        unit: { name: conversion.unitName },
                                      }),
                                    ),
                                })
                              : null;

                            setRows((prev) =>
                              prev.map((item) =>
                                item.key === row.key
                                  ? {
                                      ...item,
                                      ingredientId: nextValue,
                                      unitId: defaultUnitId,
                                    }
                                  : item,
                              ),
                            );
                          }}
                          placeholder="Select ingredient..."
                          searchPlaceholder="Search ingredient..."
                          emptyLabel="No ingredient found."
                          allowClear
                          clearLabel="Clear ingredient"
                        />
                      </div>

                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0"
                        disabled={rowsDisabled}
                        className="w-full sm:w-24 sm:min-w-24 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={row.amount == null ? "" : row.amount}
                        onChange={(event) => {
                          const amount =
                            event.target.value === ""
                              ? null
                              : Number(event.target.value);
                          setRows((prev) =>
                            prev.map((item) =>
                              item.key === row.key ? { ...item, amount } : item,
                            ),
                          );
                        }}
                      />

                      <div className="min-w-0">
                        <Select
                          value={row.unitId ?? ""}
                          onValueChange={(nextUnitId) => {
                            setRows((prev) =>
                              prev.map((item) =>
                                item.key === row.key
                                  ? { ...item, unitId: nextUnitId }
                                  : item,
                              ),
                            );
                          }}
                          disabled={rowsDisabled || !selectedIngredient}
                        >
                          <SelectTrigger className="min-w-0 w-full sm:w-32 sm:min-w-32">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map((unit) => (
                              <SelectItem key={unit.unitId} value={unit.unitId}>
                                {getUnitDisplayName({
                                  amount: row.amount,
                                  unitName: unit.unitName,
                                  unitNamePlural: unit.unitNamePlural,
                                })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="justify-self-start"
                        aria-label="Remove ingredient row"
                        disabled={rowsDisabled}
                        onClick={() => handleRemoveRow(row.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Custom meals are the only place to add/edit ingredient rows on a plan slot. */}
            {isCustomMode ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto sm:self-start"
                onClick={handleAddRow}
              >
                Add ingredient
              </Button>
            ) : null}
        </section>
      </div>

      <DialogFooter className="border-t px-4 py-4 md:px-6">
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
      </DialogFooter>
    </div>
  );
}
