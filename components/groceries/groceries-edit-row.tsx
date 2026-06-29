"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  canManageGroceriesRowIngredient,
  getGroceriesRowIngredientActionState,
} from "@/lib/groceries/groceries-row-ingredient-action";
import {
  CLEAR_GROCERY_ROW_INGREDIENT_PATCH,
  getGroceryRowPatchForLinkedIngredient,
} from "@/lib/groceries/grocery-row-ingredient-patch";
import { deriveSubstitutionsAllowed } from "@/lib/groceries/substitutions";
import { focusVisibleAmountInputInContainer } from "@/lib/focus-input-after-layout";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";
import { cn } from "@/lib/utils";

// recipeAttribution is stored as a comma-joined string at generation time;
// split it back into individual recipe names for badge rendering.
function parseRecipeNames(attribution: string | null): string[] {
  if (!attribution) return [];
  return attribution
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

type GroceriesEditRowProps = {
  row: GroceriesEditableRow;
  ingredientOptions: SearchableSelectOption[];
  renderIngredientDropdownLabel: (option: SearchableSelectOption) => React.ReactNode;
  renderIngredientTriggerLabel: (option: SearchableSelectOption) => React.ReactNode;
  ingredientById: Map<string, GroceriesEditIngredientOption>;
  unitById: Map<string, GroceriesEditUnitOption>;
  onRowChange: (rowId: string, next: Partial<GroceriesEditableRow>) => void;
  onRowRemove: (rowId: string) => void;
  onCreateIngredientRequested: (rowId: string, initialName: string) => void;
  onEditIngredientRequested: (ingredientId: string) => void;
  registerRowRef?: (rowId: string, node: HTMLElement | null) => void;
  highlighted?: boolean;
  shouldFocusAmount?: boolean;
  onAmountFocusHandled?: () => void;
};

// Plus (free-text → create dialog) or Pencil (DB row → edit dialog) beside Trash.
function GroceriesEditRowActions({
  row,
  onCreateIngredientRequested,
  onEditIngredientRequested,
  onRowRemove,
}: {
  row: GroceriesEditableRow;
  onCreateIngredientRequested: (rowId: string, initialName: string) => void;
  onEditIngredientRequested: (ingredientId: string) => void;
  onRowRemove: (rowId: string) => void;
}) {
  const actionState = getGroceriesRowIngredientActionState(row);
  const canManageIngredient = canManageGroceriesRowIngredient(row);
  const removeLabel = row.displayLabel.trim() || "item";
  const isLinkedIngredient = actionState === "edit";

  return (
    <div className="flex items-center justify-end gap-1">
      {isLinkedIngredient ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Edit ${row.displayLabel}`}
          onClick={() => {
            if (!row.ingredientId) return;
            onEditIngredientRequested(row.ingredientId);
          }}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canManageIngredient}
          aria-label={
            canManageIngredient
              ? `Create ingredient from ${row.displayLabel}`
              : "Create ingredient"
          }
          onClick={() => onCreateIngredientRequested(row.id, row.displayLabel.trim())}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${removeLabel}`}
        onClick={() => onRowRemove(row.id)}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function GroceriesEditRowComponent({
  row,
  ingredientOptions,
  renderIngredientDropdownLabel,
  renderIngredientTriggerLabel,
  ingredientById,
  unitById,
  onRowChange,
  onRowRemove,
  onCreateIngredientRequested,
  onEditIngredientRequested,
  registerRowRef,
  highlighted = false,
  shouldFocusAmount = false,
  onAmountFocusHandled,
}: GroceriesEditRowProps) {
  const amountValue = row.amount === null ? "" : String(row.amount);
  const additionalInfoValue = row.additionalInfo ?? "";
  const substitutionNoteValue = row.substitutionNote ?? "";
  const rowContainerRef = useRef<HTMLDivElement | null>(null);
  const prevIngredientIdRef = useRef(row.ingredientId);

  // Focus amount when user picks a linked ingredient in this row.
  useEffect(() => {
    const previousIngredientId = prevIngredientIdRef.current;
    prevIngredientIdRef.current = row.ingredientId;

    if (row.ingredientId && row.ingredientId !== previousIngredientId) {
      focusVisibleAmountInputInContainer(rowContainerRef.current);
    }
  }, [row.ingredientId]);

  // Library "+" scroll path: parent requests focus on this row's amount field.
  useEffect(() => {
    if (!shouldFocusAmount) return;
    focusVisibleAmountInputInContainer(rowContainerRef.current);
    onAmountFocusHandled?.();
  }, [shouldFocusAmount, onAmountFocusHandled]);

  const handleAmountChange = useCallback(
    (value: string) => {
      if (value.trim() === "") {
        if (row.amount !== null) onRowChange(row.id, { amount: null });
        return;
      }
      const nextAmount = Number(value);
      if (Number.isNaN(nextAmount) || row.amount === nextAmount) return;
      onRowChange(row.id, { amount: nextAmount });
    },
    [onRowChange, row.amount, row.id],
  );

  const handleAdditionalInfoChange = useCallback(
    (value: string) => {
      const normalized = value || null;
      if (row.additionalInfo === normalized) return;
      onRowChange(row.id, { additionalInfo: normalized });
    },
    [onRowChange, row.additionalInfo, row.id],
  );

  const handleSubstitutionNoteChange = useCallback(
    (value: string) => {
      const normalized = value || null;
      if (row.substitutionNote === normalized) return;
      onRowChange(row.id, {
        substitutionNote: normalized,
        substitutionsAllowed: deriveSubstitutionsAllowed(normalized),
      });
    },
    [onRowChange, row.id, row.substitutionNote],
  );

  const handleIngredientValueChange = useCallback(
    (nextIngredientId: string | null, freeTextOptionValue: string) => {
      if (nextIngredientId === freeTextOptionValue) return;

      if (!nextIngredientId) {
        onRowChange(row.id, { ...CLEAR_GROCERY_ROW_INGREDIENT_PATCH });
        return;
      }

      const nextIngredient = ingredientById.get(nextIngredientId);
      if (!nextIngredient) return;

      onRowChange(row.id, getGroceryRowPatchForLinkedIngredient(nextIngredient));
    },
    [ingredientById, onRowChange, row.id],
  );

  const handleCreateFreeTextOption = useCallback(
    (typedName: string) => {
      const label = typedName.trim();
      if (!label) return;
      onRowChange(row.id, {
        ingredientId: null,
        displayLabel: label,
        ingredientCategoryId: row.ingredientCategoryId,
        unitId: null,
        amount: null,
        additionalInfo: null,
        substitutionNote: null,
        substitutionsAllowed: false,
      });
    },
    [onRowChange, row.id, row.ingredientCategoryId],
  );

  const selectedIngredient = row.ingredientId
    ? ingredientById.get(row.ingredientId) ?? null
    : null;
  const freeTextOptionValue = `__free_text__${row.id}`;
  const resolvedIngredientOptions = useMemo(() => {
    if (row.ingredientId || !row.displayLabel.trim()) {
      return ingredientOptions;
    }
    return [
      {
        value: freeTextOptionValue,
        label: row.displayLabel,
      },
      ...ingredientOptions,
    ];
  }, [freeTextOptionValue, ingredientOptions, row.displayLabel, row.ingredientId]);

  const availableUnits = useMemo(
    () => selectedIngredient?.unitConversions ?? [],
    [selectedIngredient],
  );
  const adHocUnits = useMemo(
    () => [...unitById.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [unitById],
  );
  const recipeNames = useMemo(
    () => parseRecipeNames(row.recipeAttribution),
    [row.recipeAttribution],
  );
  const rowRef = useCallback(
    (node: HTMLDivElement | null) => {
      rowContainerRef.current = node;
      registerRowRef?.(row.id, node);
    },
    [registerRowRef, row.id],
  );

  const ingredientSelectProps = {
    className: "min-w-0 w-full font-normal",
    options: resolvedIngredientOptions,
    renderLabel: renderIngredientDropdownLabel,
    renderTriggerLabel: renderIngredientTriggerLabel,
    value: row.ingredientId ?? (row.displayLabel.trim() ? freeTextOptionValue : null),
    onValueChange: (nextIngredientId: string | null) =>
      handleIngredientValueChange(nextIngredientId, freeTextOptionValue),
    onCreateOption: handleCreateFreeTextOption,
    createOptionLabel: (searchTerm: string) => `Add "${searchTerm}"`,
    placeholder: "Select ingredient...",
    searchPlaceholder: "Search ingredient...",
    emptyLabel: "No ingredient found.",
  };

  const amountInputProps = {
    key: `${row.id}-amount-${row.ingredientId ?? "none"}`,
    "data-grocery-amount-input": true,
    type: "number" as const,
    min: 0,
    step: "any" as const,
    value: amountValue,
    placeholder: "Amount",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      handleAmountChange(event.target.value),
  };

  const unitSelect = (
    <Select
      value={row.unitId ?? ""}
      onValueChange={(nextUnitId) => onRowChange(row.id, { unitId: nextUnitId || null })}
      disabled={selectedIngredient ? availableUnits.length === 0 : adHocUnits.length === 0}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Unit" />
      </SelectTrigger>
      <SelectContent>
        {selectedIngredient
          ? availableUnits.map((conversion) => {
              const unit = unitById.get(conversion.unitId);
              if (!unit) return null;
              return (
                <SelectItem key={conversion.unitId} value={conversion.unitId}>
                  {getUnitDisplayName({
                    amount: row.amount,
                    unitName: unit.name,
                    unitNamePlural: unit.namePlural,
                  })}
                </SelectItem>
              );
            })
          : adHocUnits.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {getUnitDisplayName({
                  amount: row.amount,
                  unitName: unit.name,
                  unitNamePlural: unit.namePlural,
                })}
              </SelectItem>
            ))}
      </SelectContent>
    </Select>
  );

  const additionalInfoInput = (
    <Input
      key={`${row.id}-additional-info-${row.ingredientId ?? "none"}`}
      value={additionalInfoValue}
      onChange={(event) => handleAdditionalInfoChange(event.target.value)}
      placeholder="Enter additional info"
    />
  );

  const substitutionNoteInput = (
    <Input
      key={`${row.id}-substitution-note-${row.ingredientId ?? "none"}`}
      className="w-full"
      value={substitutionNoteValue}
      onChange={(event) => handleSubstitutionNoteChange(event.target.value)}
      placeholder="Enter substitutions"
    />
  );

  const rowActions = (
    <GroceriesEditRowActions
      row={row}
      onCreateIngredientRequested={onCreateIngredientRequested}
      onEditIngredientRequested={onEditIngredientRequested}
      onRowRemove={onRowRemove}
    />
  );

  return (
    <div
      ref={rowRef}
      data-row-id={row.id}
      className={cn(
        "scroll-mt-28 space-y-2 rounded-lg border bg-card p-3 transition-shadow",
        highlighted &&
          "ring-2 ring-primary/70 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="space-y-2 xl:hidden">
        <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_7rem_10rem_auto]">
          <SearchableSelect {...ingredientSelectProps} />
          <Input {...amountInputProps} />
          {unitSelect}
          {rowActions}
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {additionalInfoInput}
          {substitutionNoteInput}
        </div>
      </div>

      <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.3fr)_7rem_10rem_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-start xl:gap-2">
        <SearchableSelect {...ingredientSelectProps} />
        <Input {...amountInputProps} />
        {unitSelect}
        {additionalInfoInput}
        {substitutionNoteInput}
        {rowActions}
      </div>

      {recipeNames.length > 0 ? (
        <div className="-mx-3 -mb-3 rounded-b-lg px-3 pt-0 pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {recipeNames.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const GroceriesEditRow = memo(GroceriesEditRowComponent);
