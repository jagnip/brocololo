"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import type { IngredientType } from "@/types/ingredient";

export type LogIngredientOption = {
  id: string;
  name: string;
  brand: string | null;
  defaultUnitId: string | null;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  unitConversions: Array<{
    unitId: string;
    gramsPerUnit: number;
    unitName: string;
    unitNamePlural: string | null;
  }>;
};

export type EditableIngredientRow = {
  ingredientId: string | null;
  unitId: string | null;
  amount: number | null;
};

type DialogRow = EditableIngredientRow & { key: string };

type IngredientFormDependencies = {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; namePlural: string | null }>;
  gramsUnitId: string;
  iconOptions: string[];
};

type EditLogIngredientsDialogProps = {
  open: boolean;
  title: string;
  subtitle: string;
  titleClassName?: string;
  initialRows: EditableIngredientRow[];
  ingredientOptions: LogIngredientOption[];
  ingredientFormDependencies?: IngredientFormDependencies;
  isSaving: boolean;
  contextControls?: ReactNode;
  saveLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (rows: EditableIngredientRow[]) => Promise<void>;
};

type EditLogIngredientsFormProps = Omit<
  EditLogIngredientsDialogProps,
  "open" | "onOpenChange"
> & {
  onCancel?: () => void;
};

function toRowKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
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

  const ingredientById = new Map(ingredientOptions.map((option) => [option.id, option]));

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

function mapIngredientToLogOption(ingredient: IngredientType): LogIngredientOption {
  // Keep the integration boundary explicit between IngredientType and log dialog options.
  return {
    id: ingredient.id,
    name: ingredient.name,
    brand: ingredient.brand,
    defaultUnitId: ingredient.defaultUnitId,
    calories: ingredient.calories,
    proteins: ingredient.proteins,
    fats: ingredient.fats,
    carbs: ingredient.carbs,
    unitConversions: ingredient.unitConversions.map((conversion) => ({
      unitId: conversion.unitId,
      gramsPerUnit: conversion.gramsPerUnit,
      unitName: conversion.unit.name,
      unitNamePlural: conversion.unit.namePlural ?? null,
    })),
  };
}

export function EditLogIngredientsForm({
  title,
  subtitle,
  initialRows,
  ingredientOptions,
  ingredientFormDependencies,
  isSaving,
  contextControls,
  saveLabel = "Save",
  onCancel,
  onSave,
}: EditLogIngredientsFormProps) {
  const [rows, setRows] = useState<DialogRow[]>(() =>
    initialRows.map((row) => ({
      ...row,
      key: toRowKey(),
    })),
  );
  const [localIngredientOptions, setLocalIngredientOptions] = useState(ingredientOptions);

  useEffect(() => {
    setLocalIngredientOptions(ingredientOptions);
  }, [ingredientOptions]);

  useEffect(() => {
    // Reset editable rows whenever parent context switches to another slot/recipe.
    setRows(
      initialRows.map((row) => ({
        ...row,
        key: toRowKey(),
      })),
    );
  }, [initialRows]);

  const ingredientById = useMemo(
    () => new Map(localIngredientOptions.map((ingredient) => [ingredient.id, ingredient])),
    [localIngredientOptions],
  );

  const macros = useMemo(() => getMacrosFromRows(rows, localIngredientOptions), [
    localIngredientOptions,
    rows,
  ]);

  const ingredientSelectOptions = useMemo(
    () => localIngredientOptions.map((ingredient) => ({
      value: ingredient.id,
      label: getIngredientDisplayName(ingredient.name, ingredient.brand),
    })),
    [localIngredientOptions],
  );

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
    const normalizedRows = rows.map((row) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      amount: row.amount,
    }));

    const hasInvalidRow = normalizedRows.some(
      (row) => !row.ingredientId || !row.unitId || row.amount == null || row.amount <= 0,
    );

    if (hasInvalidRow) {
      toast.error("Each row must have ingredient, unit and positive amount");
      return;
    }

    await onSave(normalizedRows);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-4 md:px-6 md:py-6 border-b text-left">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
          {contextControls ? <div className="mt-4">{contextControls}</div> : null}
        </div>

        <section className="px-4 py-4 md:px-6 md:py-6 border-b">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{macros.calories.toFixed(0)} kcal</Badge>
            <Badge variant="secondary">{macros.proteins.toFixed(1)}g protein</Badge>
            <Badge variant="secondary">{macros.fats.toFixed(1)}g fat</Badge>
            <Badge variant="secondary">{macros.carbs.toFixed(1)}g carbs</Badge>
          </div>
        </section>

        <section className="px-4 py-4 md:px-6 md:py-6 border-b flex flex-col gap-2">
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_96px_128px_auto] lg:grid-cols-[minmax(0,32rem)_96px_128px_auto] gap-2 text-xs tracking-wide uppercase text-muted-foreground font-semibold">
            <span>Ingredient</span>
            <span>Amount</span>
            <span>Unit</span>
            <span className="sr-only">Remove</span>
          </div>

          <div className="space-y-2">
            {rows.map((row) => {
              const selectedIngredient = row.ingredientId
                ? ingredientById.get(row.ingredientId)
                : null;
              const availableUnits = selectedIngredient?.unitConversions ?? [];

              return (
                <div
                  key={row.key}
                    // Mobile-only row framing mirrors recipe-page ingredient cards.
                    className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-md border border-border/60 p-2 sm:rounded-none sm:border-0 sm:p-0 sm:gap-2 sm:grid-cols-[minmax(0,1fr)_96px_128px_auto] lg:grid-cols-[minmax(0,32rem)_96px_128px_auto]"
                >
          
                  <div className="min-w-0 col-span-3 sm:col-span-1">
                    <SearchableSelect
                      className="min-w-0 w-full font-normal"
                      options={ingredientSelectOptions}
                      value={row.ingredientId}
                      onValueChange={(nextValue) => {
                        if (!nextValue) {
                          setRows((prev) => prev.map((item) =>
                            item.key === row.key
                              ? { ...item, ingredientId: null, unitId: null, amount: null }
                              : item,
                          ));
                          return;
                        }

                        const ingredient = ingredientById.get(nextValue);
                        const defaultUnitId = ingredient
                          ? getDefaultUnitIdForIngredient({
                              defaultUnitId: ingredient.defaultUnitId,
                              unitConversions: ingredient.unitConversions.map((conversion) => ({
                                unitId: conversion.unitId,
                                unit: { name: conversion.unitName },
                              })),
                            })
                          : null;

                        setRows((prev) => prev.map((item) =>
                          item.key === row.key
                            ? {
                                ...item,
                                ingredientId: nextValue,
                                unitId: defaultUnitId,
                              }
                            : item,
                        ));
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
                      const amount = event.target.value === ""
                        ? null
                        : Number(event.target.value);
                      setRows((prev) => prev.map((item) =>
                        item.key === row.key ? { ...item, amount } : item,
                      ));
                    }}
                  />

                  <div className="min-w-0">
                    <Select
                      value={row.unitId ?? ""}
                      onValueChange={(nextUnitId) => {
                        setRows((prev) => prev.map((item) =>
                          item.key === row.key ? { ...item, unitId: nextUnitId } : item,
                        ));
                      }}
                      disabled={!selectedIngredient}
                    >
                 
                      <SelectTrigger className="min-w-0 w-full sm:w-32 sm:min-w-32 [&>svg]:hidden">
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

            <Button type="button" variant="outline" onClick={handleAddRow}>
              Add ingredient
            </Button>
        </section>
      </div>

      <DialogFooter className="px-4 py-4 md:px-6 md:py-6 flex-row justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function EditLogIngredientsDialog({
  open,
  onOpenChange,
  ...formProps
}: EditLogIngredientsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[min(1000px,calc(100vw-3rem))] sm:max-w-[1000px] lg:w-[min(1200px,calc(100vw-4rem))] lg:max-w-[1200px] xl:w-[min(1400px,calc(100vw-5rem))] xl:max-w-[1400px] 2xl:w-[min(1600px,calc(100vw-6rem))] 2xl:max-w-[1600px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col"
      >
        <EditLogIngredientsForm
          {...formProps}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
