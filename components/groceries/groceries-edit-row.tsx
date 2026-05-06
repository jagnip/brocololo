"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
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
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import { SubstitutionsAllowedControl } from "@/components/groceries/substitutions-allowed-control";
import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";

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
};

export function GroceriesEditRow({
  row,
  ingredientOptions,
  renderIngredientDropdownLabel,
  renderIngredientTriggerLabel,
  ingredientById,
  unitById,
  onRowChange,
  onRowRemove,
}: GroceriesEditRowProps) {
  const selectedIngredient = row.ingredientId
    ? ingredientById.get(row.ingredientId) ?? null
    : null;
  const pieceUnitId = useMemo(() => {
    const piece = [...unitById.values()].find(
      (unit) => unit.name.trim().toLowerCase() === "piece",
    );
    return piece?.id ?? null;
  }, [unitById]);
  const freeTextOptionValue = `__free_text__${row.id}`;
  const resolvedIngredientOptions = useMemo(() => {
    if (row.ingredientId || !row.displayLabel.trim()) {
      return ingredientOptions;
    }
    // Keep created free-text visible in the trigger even though it's not from DB options.
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

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_7rem_10rem_auto]">
        <SearchableSelect
          className="min-w-0 w-full font-normal"
          options={resolvedIngredientOptions}
          renderLabel={renderIngredientDropdownLabel}
          renderTriggerLabel={renderIngredientTriggerLabel}
          value={row.ingredientId ?? (row.displayLabel.trim() ? freeTextOptionValue : null)}
          onValueChange={(nextIngredientId) => {
            if (nextIngredientId === freeTextOptionValue) return;
            if (!nextIngredientId) return;
            const nextIngredient = ingredientById.get(nextIngredientId);
            if (!nextIngredient) return;

            const nextUnitId = getDefaultUnitIdForIngredient({
              defaultUnitId: nextIngredient.defaultUnitId,
              unitConversions: nextIngredient.unitConversions.map((conversion) => ({
                unitId: conversion.unitId,
                unit: { name: conversion.unit.name },
              })),
            });

            // Ingredient changes should update category + label to keep rows aligned with section ordering.
            onRowChange(row.id, {
              ingredientId: nextIngredient.id,
              ingredientCategoryId: nextIngredient.categoryId,
              displayLabel: nextIngredient.name,
              unitId: nextUnitId,
              // Reset amount to avoid carrying stale values across ingredient/unit changes.
              amount: null,
            });
          }}
          onCreateOption={(typedName) => {
            const label = typedName.trim();
            if (!label) return;
            onRowChange(row.id, {
              ingredientId: null,
              displayLabel: label,
              // Keep free-text row in the current section category.
              ingredientCategoryId: row.ingredientCategoryId,
              // Ad-hoc groceries default to "piece" when available.
              unitId: pieceUnitId,
              amount: null,
            });
          }}
          createOptionLabel={(searchTerm) => `Add "${searchTerm}"`}
          placeholder="Select ingredient..."
          searchPlaceholder="Search ingredient..."
          emptyLabel="No ingredient found."
          allowClear={false}
        />

        <Input
          type="number"
          min={0}
          step="any"
          value={row.amount ?? ""}
          placeholder="Amount"
          onChange={(event) => {
            const amount = event.target.value === "" ? null : Number(event.target.value);
            onRowChange(row.id, { amount });
          }}
        />

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

        {/* Row-level delete action: remove this ingredient from the edit draft. */}
        <div className="flex md:justify-end">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${row.displayLabel}`}
            onClick={() => onRowRemove(row.id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Keep meta fields stacked by default, then align side-by-side on xl. */}
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <Input
          value={row.additionalInfo ?? ""}
          onChange={(event) =>
            onRowChange(row.id, { additionalInfo: event.target.value || null })
          }
          placeholder="Enter additional info"
        />

        <div className="grid grid-cols-1 gap-y-2 md:grid-cols-[max-content_minmax(0,1fr)] md:gap-x-2">
          <SubstitutionsAllowedControl
            checked={row.substitutionsAllowed}
            onCheckedChange={(checked) =>
              onRowChange(row.id, { substitutionsAllowed: checked })
            }
            // Keep this label on one line in the dense groceries edit grid.
            labelClassName="whitespace-nowrap"
          />
          <Input
            className="w-full"
            value={row.substitutionNote ?? ""}
            onChange={(event) =>
              onRowChange(row.id, { substitutionNote: event.target.value || null })
            }
            placeholder="Enter substitutions"
            disabled={!row.substitutionsAllowed}
          />
        </div>
      </div>

      {/* Bottom badges listing every planner recipe that contributed
          this ingredient. Kept background transparent per UI request. */}
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
