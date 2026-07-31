"use client";

import { useCallback, useMemo } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { PlanCustomMealIngredient } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import {
  getPlannerSlotIngredientDisplayLines,
  type FamilyMemberRef,
} from "@/lib/planner/resolve-slot-ingredients";
import { cn } from "@/lib/utils";
import { PlanSlotWhoEats } from "./plan-slot-who-eats";

export type DialogIngredientRow = EditableIngredientRow & { key: string };

type PlanSlotIngredientsPanelProps = {
  mode: "recipe" | "custom" | "empty";
  recipe: RecipeType | null;
  customMealIngredients?: PlanCustomMealIngredient[];
  cookingFamilyMemberIds: string[];
  familyMembers: FamilyMemberRef[];
  ingredientOptions: LogIngredientOption[];
  /** Editable rows — only used in custom mode. */
  rows: DialogIngredientRow[];
  onRowsChange: (rows: DialogIngredientRow[]) => void;
  /** When true, wrap the list in a Collapsible for mobile. */
  collapsibleOnMobile?: boolean;
  /**
   * Live "N of M meals" for a batch cook spanning multiple plan days.
   * When set, amounts are divided by total so the panel shows one day's share.
   */
  batchLabel?: { index: number; total: number } | null;
  /**
   * Mobile sheet only — Cooking for chips inside the collapsible.
   * Desktop keeps Cooking for outside this panel.
   */
  whoEats?: {
    familyMembers: FamilyMemberRow[];
    value: string[];
    onChange: (nextValue: string[]) => void;
  } | null;
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

function RecipeIngredientList({
  recipe,
  customMealIngredients,
  cookingFamilyMemberIds,
  familyMembers,
  ingredientOptions,
  mealPortionCount = 1,
}: {
  recipe: RecipeType | null;
  customMealIngredients?: PlanCustomMealIngredient[];
  cookingFamilyMemberIds: string[];
  familyMembers: FamilyMemberRef[];
  ingredientOptions: LogIngredientOption[];
  mealPortionCount?: number;
}) {
  const lines = useMemo(
    () =>
      getPlannerSlotIngredientDisplayLines({
        recipe,
        customMealIngredients,
        cookingFamilyMemberIds,
        familyMembers,
        ingredientOptions,
        mealPortionCount,
      }),
    [
      cookingFamilyMemberIds,
      customMealIngredients,
      familyMembers,
      ingredientOptions,
      mealPortionCount,
      recipe,
    ],
  );

  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No ingredients for the selected eaters.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {lines.map((line) => (
        <li
          key={line.key}
          className="flex items-baseline justify-between gap-3 py-2 text-sm"
        >
          <span className="min-w-0 truncate text-foreground">{line.name}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {line.amountLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CustomIngredientEditor({
  rows,
  onRowsChange,
  ingredientOptions,
}: {
  rows: DialogIngredientRow[];
  onRowsChange: (rows: DialogIngredientRow[]) => void;
  ingredientOptions: LogIngredientOption[];
}) {
  const ingredientById = useMemo(
    () =>
      new Map(
        ingredientOptions.map((ingredient) => [ingredient.id, ingredient]),
      ),
    [ingredientOptions],
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

  const handleAddRow = () => {
    onRowsChange([
      ...rows,
      {
        key: toRowKey(),
        ingredientId: null,
        unitId: null,
        amount: null,
      },
    ]);
  };

  const handleRemoveRow = (rowKey: string) => {
    onRowsChange(rows.filter((row) => row.key !== rowKey));
  };

  return (
    <div className={cn("flex flex-col", rows.length > 0 && "gap-4")}>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => {
            const selectedIngredient = row.ingredientId
              ? ingredientById.get(row.ingredientId)
              : null;
            const availableUnits = selectedIngredient?.unitConversions ?? [];

            return (
              <div
                key={row.key}
                className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-md border border-border p-2 sm:rounded-none sm:border-0 sm:p-0 sm:gap-2 sm:grid-cols-[minmax(0,1fr)_96px_128px_auto]"
              >
                <div className="min-w-0 col-span-3 sm:col-span-1">
                  <SearchableSelect
                    className="min-w-0 w-full font-normal"
                    options={ingredientSelectOptions}
                    renderLabel={renderIngredientDropdownLabel}
                    renderTriggerLabel={renderIngredientTriggerLabel}
                    value={row.ingredientId}
                    onValueChange={(nextValue) => {
                      if (!nextValue) {
                        onRowsChange(
                          rows.map((item) =>
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
                            unitConversions: ingredient.unitConversions.map(
                              (conversion) => ({
                                unitId: conversion.unitId,
                                unit: { name: conversion.unitName },
                              }),
                            ),
                          })
                        : null;

                      onRowsChange(
                        rows.map((item) =>
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
                  className="w-full sm:w-24 sm:min-w-24 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={row.amount == null ? "" : row.amount}
                  onChange={(event) => {
                    const amount =
                      event.target.value === ""
                        ? null
                        : Number(event.target.value);
                    onRowsChange(
                      rows.map((item) =>
                        item.key === row.key ? { ...item, amount } : item,
                      ),
                    );
                  }}
                />

                <div className="min-w-0">
                  <Select
                    value={row.unitId ?? ""}
                    onValueChange={(nextUnitId) => {
                      onRowsChange(
                        rows.map((item) =>
                          item.key === row.key
                            ? { ...item, unitId: nextUnitId }
                            : item,
                        ),
                      );
                    }}
                    disabled={!selectedIngredient}
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
                  onClick={() => handleRemoveRow(row.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto sm:self-start"
        onClick={handleAddRow}
      >
        Add ingredient
      </Button>
    </div>
  );
}

/** Heading + optional batch badge + ingredient rows. */
function IngredientsBody(props: PlanSlotIngredientsPanelProps) {
  // Batch cook spanning multiple days — badge names "meals" so it isn't read as portions.
  const showBatchBadge =
    props.mode === "recipe" &&
    props.recipe?.isBatchRecipe &&
    props.batchLabel != null &&
    props.batchLabel.total >= 2;
  const mealPortionCount = showBatchBadge ? props.batchLabel!.total : 1;

  const batchBadge = showBatchBadge ? (
    <Badge
      variant="secondary"
      aria-label={`Batch meal ${props.batchLabel!.index} of ${props.batchLabel!.total}`}
    >
      {/* Same hierarchy as instruction ingredient chips: bold label + muted detail. */}
      <span className="type-caption font-semibold">
        <span>Batch</span>
        <span className="pl-0.5 font-medium opacity-75">
          {` · ${props.batchLabel!.index} of ${props.batchLabel!.total}`}
        </span>
      </span>
    </Badge>
  ) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ingredients for this meal
        </p>
        {batchBadge}
      </div>

      {props.mode === "recipe" ? (
        <RecipeIngredientList
          recipe={props.recipe}
          customMealIngredients={props.customMealIngredients}
          cookingFamilyMemberIds={props.cookingFamilyMemberIds}
          familyMembers={props.familyMembers}
          ingredientOptions={props.ingredientOptions}
          mealPortionCount={mealPortionCount}
        />
      ) : null}

      {props.mode === "custom" ? (
        <CustomIngredientEditor
          rows={props.rows}
          onRowsChange={props.onRowsChange}
          ingredientOptions={props.ingredientOptions}
        />
      ) : null}
    </div>
  );
}

function formatIngredientsSheetTitle(lineCount: number, peopleCount: number) {
  const ingredientLabel =
    lineCount === 1 ? "1 ingredient" : `${lineCount} ingredients`;

  if (peopleCount <= 0) {
    return ingredientLabel;
  }

  const peopleLabel = peopleCount === 1 ? "1 person" : `${peopleCount} people`;
  return `${ingredientLabel} for ${peopleLabel}`;
}

/**
 * Right-column (desktop) / collapsible (mobile) ingredient section.
 * Recipe mode is read-only; custom mode is fully editable.
 * Desktop hides until a recipe is picked; mobile sheet stays up so Cooking for is reachable.
 */
export function PlanSlotIngredientsPanel(props: PlanSlotIngredientsPanelProps) {
  const lineCount = useMemo(() => {
    if (props.mode === "custom") return props.rows.length;
    if (props.mode === "empty") return 0;
    return getPlannerSlotIngredientDisplayLines({
      recipe: props.recipe,
      customMealIngredients: props.customMealIngredients,
      cookingFamilyMemberIds: props.cookingFamilyMemberIds,
      familyMembers: props.familyMembers,
      ingredientOptions: props.ingredientOptions,
    }).length;
  }, [props]);

  // Desktop: hide until a recipe is picked (Cooking for lives outside this panel).
  if (props.mode === "empty" && !props.collapsibleOnMobile) {
    return null;
  }

  // Desktop: always expanded in the right column.
  if (!props.collapsibleOnMobile) {
    return <IngredientsBody {...props} />;
  }

  const triggerLabel = formatIngredientsSheetTitle(
    lineCount,
    props.cookingFamilyMemberIds.length,
  );

  return (
    <Collapsible className="group/ingredients border-t">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40 md:px-6">
        <span>{triggerLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/ingredients:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-[40vh] overflow-y-auto border-t px-4 py-3 md:px-6">
        <div className="space-y-4">
          {props.whoEats != null ? (
            <PlanSlotWhoEats
              familyMembers={props.whoEats.familyMembers}
              value={props.whoEats.value}
              onChange={props.whoEats.onChange}
            />
          ) : null}
          {props.mode !== "empty" ? <IngredientsBody {...props} /> : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { toRowKey };
