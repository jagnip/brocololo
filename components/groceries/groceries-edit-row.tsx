"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
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
  // Optional ref registration callback so the parent can register this row's
  // DOM node and scroll to it (e.g. when a library-panel "+" lands on this row).
  registerRowRef?: (rowId: string, node: HTMLElement | null) => void;
  // When true, applies a transient ring/pulse so the user can spot the row
  // that just received a library "+". The parent clears the flag after a
  // short timeout.
  highlighted?: boolean;
};

const EDIT_COMMIT_DEBOUNCE_MS = 180;

function GroceriesEditRowComponent({
  row,
  ingredientOptions,
  renderIngredientDropdownLabel,
  renderIngredientTriggerLabel,
  ingredientById,
  unitById,
  onRowChange,
  onRowRemove,
  registerRowRef,
  highlighted = false,
}: GroceriesEditRowProps) {
  const amountInputRef = useRef(row.amount === null ? "" : String(row.amount));
  const additionalInfoInputRef = useRef(row.additionalInfo ?? "");
  const substitutionNoteInputRef = useRef(row.substitutionNote ?? "");
  const amountCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const additionalInfoCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const substitutionNoteCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const amountPropValue = row.amount === null ? "" : String(row.amount);
  const additionalInfoPropValue = row.additionalInfo ?? "";
  const substitutionNotePropValue = row.substitutionNote ?? "";

  const commitAmount = useCallback(
    (value: string) => {
      const nextAmount = value.trim() === "" ? null : Number(value);
      if (nextAmount !== null && Number.isNaN(nextAmount)) return;
      if (row.amount === nextAmount) return;
      onRowChange(row.id, { amount: nextAmount });
    },
    [onRowChange, row.amount, row.id],
  );
  const commitAdditionalInfo = useCallback(
    (value: string) => {
      const normalized = value || null;
      if (row.additionalInfo === normalized) return;
      onRowChange(row.id, { additionalInfo: normalized });
    },
    [onRowChange, row.additionalInfo, row.id],
  );
  const commitSubstitutionNote = useCallback(
    (value: string) => {
      const normalized = value || null;
      if (row.substitutionNote === normalized) return;
      onRowChange(row.id, { substitutionNote: normalized });
    },
    [onRowChange, row.id, row.substitutionNote],
  );

  useEffect(() => {
    return () => {
      if (amountCommitTimerRef.current) clearTimeout(amountCommitTimerRef.current);
      if (additionalInfoCommitTimerRef.current) {
        clearTimeout(additionalInfoCommitTimerRef.current);
      }
      if (substitutionNoteCommitTimerRef.current) {
        clearTimeout(substitutionNoteCommitTimerRef.current);
      }
    };
  }, []);

  const selectedIngredient = row.ingredientId
    ? ingredientById.get(row.ingredientId) ?? null
    : null;
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
  const rowRef = useCallback(
    (node: HTMLElement | null) => {
      registerRowRef?.(row.id, node);
    },
    [registerRowRef, row.id],
  );

  return (
    <div
      // scroll-mt-28 keeps the row from being hidden behind the sticky
      // category navigator when the parent calls scrollIntoView.
      ref={rowRef}
      data-row-id={row.id}
      className={cn(
        "scroll-mt-28 space-y-2 rounded-lg border bg-card p-3 transition-shadow",
        // Transient highlight applied when this row was just added via the
        // library panel. The parent clears `highlighted` after ~1.5s.
        highlighted &&
          "ring-2 ring-primary/70 ring-offset-2 ring-offset-background",
      )}
    >
      {/* Mobile/tablet layout remains stacked for readability and touch comfort. */}
      <div className="space-y-2 xl:hidden">
        <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_7rem_10rem_auto]">
          <SearchableSelect
            className="min-w-0 w-full font-normal"
            options={resolvedIngredientOptions}
            renderLabel={renderIngredientDropdownLabel}
            renderTriggerLabel={renderIngredientTriggerLabel}
            value={row.ingredientId ?? (row.displayLabel.trim() ? freeTextOptionValue : null)}
            onValueChange={(nextIngredientId) => {
              if (nextIngredientId === freeTextOptionValue) return;
              // null = user cleared the ingredient. Strip name + quantity so the
              // row becomes "nameless" and gets dropped on save.
              if (!nextIngredientId) {
                onRowChange(row.id, {
                  ingredientId: null,
                  displayLabel: "",
                  unitId: null,
                  amount: null,
                });
                return;
              }
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
                // Leave unit empty for ad-hoc groceries until user explicitly picks one.
                unitId: null,
                amount: null,
              });
            }}
            createOptionLabel={(searchTerm) => `Add "${searchTerm}"`}
            placeholder="Select ingredient..."
            searchPlaceholder="Search ingredient..."
            emptyLabel="No ingredient found."
          />

          <Input
            type="number"
            min={0}
            step="any"
            defaultValue={amountPropValue}
            placeholder="Amount"
            onChange={(event) => {
              const nextValue = event.target.value;
              amountInputRef.current = nextValue;
              if (amountCommitTimerRef.current) clearTimeout(amountCommitTimerRef.current);
              amountCommitTimerRef.current = setTimeout(() => {
                commitAmount(nextValue);
              }, EDIT_COMMIT_DEBOUNCE_MS);
            }}
            onBlur={() => commitAmount(amountInputRef.current)}
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
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${row.displayLabel}`}
              onClick={() => onRowRemove(row.id)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
          <Input
            defaultValue={additionalInfoPropValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              additionalInfoInputRef.current = nextValue;
              if (additionalInfoCommitTimerRef.current) {
                clearTimeout(additionalInfoCommitTimerRef.current);
              }
              additionalInfoCommitTimerRef.current = setTimeout(() => {
                commitAdditionalInfo(nextValue);
              }, EDIT_COMMIT_DEBOUNCE_MS);
            }}
            onBlur={() => commitAdditionalInfo(additionalInfoInputRef.current)}
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
              defaultValue={substitutionNotePropValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                substitutionNoteInputRef.current = nextValue;
                if (substitutionNoteCommitTimerRef.current) {
                  clearTimeout(substitutionNoteCommitTimerRef.current);
                }
                substitutionNoteCommitTimerRef.current = setTimeout(() => {
                  commitSubstitutionNote(nextValue);
                }, EDIT_COMMIT_DEBOUNCE_MS);
              }}
              onBlur={() => commitSubstitutionNote(substitutionNoteInputRef.current)}
              placeholder="Enter substitutions"
              disabled={!row.substitutionsAllowed}
            />
          </div>
        </div>
      </div>

      {/* Desktop layout: keep all controls in one horizontal row for faster scanning/editing. */}
      <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.3fr)_7rem_10rem_minmax(0,1fr)_max-content_minmax(0,1fr)_auto] xl:items-start xl:gap-2">
        <SearchableSelect
          className="min-w-0 w-full font-normal"
          options={resolvedIngredientOptions}
          renderLabel={renderIngredientDropdownLabel}
          renderTriggerLabel={renderIngredientTriggerLabel}
          value={row.ingredientId ?? (row.displayLabel.trim() ? freeTextOptionValue : null)}
          onValueChange={(nextIngredientId) => {
            if (nextIngredientId === freeTextOptionValue) return;
            if (!nextIngredientId) {
              onRowChange(row.id, {
                ingredientId: null,
                displayLabel: "",
                unitId: null,
                amount: null,
              });
              return;
            }
            const nextIngredient = ingredientById.get(nextIngredientId);
            if (!nextIngredient) return;

            const nextUnitId = getDefaultUnitIdForIngredient({
              defaultUnitId: nextIngredient.defaultUnitId,
              unitConversions: nextIngredient.unitConversions.map((conversion) => ({
                unitId: conversion.unitId,
                unit: { name: conversion.unit.name },
              })),
            });

            onRowChange(row.id, {
              ingredientId: nextIngredient.id,
              ingredientCategoryId: nextIngredient.categoryId,
              displayLabel: nextIngredient.name,
              unitId: nextUnitId,
              amount: null,
            });
          }}
          onCreateOption={(typedName) => {
            const label = typedName.trim();
            if (!label) return;
            onRowChange(row.id, {
              ingredientId: null,
              displayLabel: label,
              ingredientCategoryId: row.ingredientCategoryId,
              unitId: null,
              amount: null,
            });
          }}
          createOptionLabel={(searchTerm) => `Add "${searchTerm}"`}
          placeholder="Select ingredient..."
          searchPlaceholder="Search ingredient..."
          emptyLabel="No ingredient found."
        />

        <Input
          type="number"
          min={0}
          step="any"
          defaultValue={amountPropValue}
          placeholder="Amount"
          onChange={(event) => {
            const nextValue = event.target.value;
            amountInputRef.current = nextValue;
            if (amountCommitTimerRef.current) clearTimeout(amountCommitTimerRef.current);
            amountCommitTimerRef.current = setTimeout(() => {
              commitAmount(nextValue);
            }, EDIT_COMMIT_DEBOUNCE_MS);
          }}
          onBlur={() => commitAmount(amountInputRef.current)}
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

        <Input
          defaultValue={additionalInfoPropValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            additionalInfoInputRef.current = nextValue;
            if (additionalInfoCommitTimerRef.current) {
              clearTimeout(additionalInfoCommitTimerRef.current);
            }
            additionalInfoCommitTimerRef.current = setTimeout(() => {
              commitAdditionalInfo(nextValue);
            }, EDIT_COMMIT_DEBOUNCE_MS);
          }}
          onBlur={() => commitAdditionalInfo(additionalInfoInputRef.current)}
          placeholder="Enter additional info"
        />

        {/* Top-align switcher with adjacent inputs to keep row baselines consistent. */}
        <div className="flex h-10 items-start">
          <SubstitutionsAllowedControl
            checked={row.substitutionsAllowed}
            onCheckedChange={(checked) => onRowChange(row.id, { substitutionsAllowed: checked })}
            // Keep this label on one line in the dense groceries edit grid.
            labelClassName="whitespace-nowrap"
          />
        </div>

        <Input
          className="w-full"
          defaultValue={substitutionNotePropValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            substitutionNoteInputRef.current = nextValue;
            if (substitutionNoteCommitTimerRef.current) {
              clearTimeout(substitutionNoteCommitTimerRef.current);
            }
            substitutionNoteCommitTimerRef.current = setTimeout(() => {
              commitSubstitutionNote(nextValue);
            }, EDIT_COMMIT_DEBOUNCE_MS);
          }}
          onBlur={() => commitSubstitutionNote(substitutionNoteInputRef.current)}
          placeholder="Enter substitutions"
          disabled={!row.substitutionsAllowed}
        />

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${row.displayLabel}`}
            onClick={() => onRowRemove(row.id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
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

export const GroceriesEditRow = memo(GroceriesEditRowComponent);
