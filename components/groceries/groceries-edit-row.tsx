"use client";

import { useMemo } from "react";
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

type GroceriesEditRowProps = {
  row: GroceriesEditableRow;
  ingredientOptions: SearchableSelectOption[];
  ingredientById: Map<string, GroceriesEditIngredientOption>;
  unitById: Map<string, GroceriesEditUnitOption>;
  onRowChange: (rowId: string, next: Partial<GroceriesEditableRow>) => void;
};

export function GroceriesEditRow({
  row,
  ingredientOptions,
  ingredientById,
  unitById,
  onRowChange,
}: GroceriesEditRowProps) {
  const selectedIngredient = ingredientById.get(row.ingredientId) ?? null;
  const availableUnits = useMemo(
    () => selectedIngredient?.unitConversions ?? [],
    [selectedIngredient],
  );

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_7rem_10rem]">
        <SearchableSelect
          options={ingredientOptions}
          value={row.ingredientId}
          onValueChange={(nextIngredientId) => {
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
          disabled={availableUnits.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            {availableUnits.map((conversion) => {
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
            })}
          </SelectContent>
        </Select>
      </div>

      <Input
        value={row.additionalInfo ?? ""}
        onChange={(event) =>
          onRowChange(row.id, { additionalInfo: event.target.value || null })
        }
        placeholder="Additional info..."
      />

      <div className="grid gap-2 md:grid-cols-[12rem_minmax(0,1fr)]">
        <SubstitutionsAllowedControl
          checked={row.substitutionsAllowed}
          onCheckedChange={(checked) =>
            onRowChange(row.id, { substitutionsAllowed: checked })
          }
          className="h-10"
        />
        <Input
          value={row.substitutionNote ?? ""}
          onChange={(event) =>
            onRowChange(row.id, { substitutionNote: event.target.value || null })
          }
          placeholder="Substitution..."
          disabled={!row.substitutionsAllowed}
        />
      </div>
    </div>
  );
}
