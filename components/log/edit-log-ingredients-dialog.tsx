"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { CreateIngredientDialog } from "@/components/recipes/form/create-ingredient-dialog";
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

type CreateIngredientState = {
  rowKey: string;
  initialName: string;
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

export function EditLogIngredientsDialog({
  open,
  title,
  subtitle,
  initialRows,
  ingredientOptions,
  ingredientFormDependencies,
  isSaving,
  contextControls,
  saveLabel = "Save",
  onOpenChange,
  onSave,
}: EditLogIngredientsDialogProps) {
  const [rows, setRows] = useState<DialogRow[]>(() =>
    initialRows.map((row) => ({
      ...row,
      key: toRowKey(),
    })),
  );
  const [localIngredientOptions, setLocalIngredientOptions] = useState(ingredientOptions);
  const [createIngredientState, setCreateIngredientState] =
    useState<CreateIngredientState | null>(null);

  useEffect(() => {
    setLocalIngredientOptions(ingredientOptions);
  }, [ingredientOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setRows(
      initialRows.map((row) => ({
        ...row,
        key: toRowKey(),
      })),
    );
  }, [initialRows, open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[min(1000px,calc(100vw-3rem))] sm:max-w-[1000px] lg:w-[min(1200px,calc(100vw-4rem))] lg:max-w-[1200px] xl:w-[min(1400px,calc(100vw-5rem))] xl:max-w-[1400px] 2xl:w-[min(1600px,calc(100vw-6rem))] 2xl:max-w-[1600px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Keep footer fixed by scrolling the whole content area above it. */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <DialogHeader className="px-6 py-5 border-b">
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
            {contextControls ? <div className="mt-4">{contextControls}</div> : null}
          </DialogHeader>

          <section className="px-6 py-4 border-b">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{macros.calories.toFixed(0)} kcal</Badge>
              <Badge variant="outline">{macros.proteins.toFixed(1)}g protein</Badge>
              <Badge variant="outline">{macros.fats.toFixed(1)}g fat</Badge>
              <Badge variant="outline">{macros.carbs.toFixed(1)}g carbs</Badge>
            </div>
          </section>

          <section className="px-6 py-4 border-b space-y-3">
          {/* Mobile uses a stacked row layout, so keep column labels desktop-only. */}
          <div className="hidden sm:grid sm:grid-cols-[minmax(240px,1fr)_104px_104px_44px] gap-2 px-2 text-xs tracking-wide uppercase text-muted-foreground font-semibold">
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
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] sm:grid-cols-[minmax(240px,1fr)_104px_104px_44px] gap-2"
                >
                  {/* On mobile the ingredient selector gets its own row for readability. */}
                  <div className="min-w-0 col-span-3 sm:col-span-1">
                    <SearchableSelect
                      className="min-w-0 sm:min-w-[240px]"
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
                      onCreateOption={(searchTerm) => {
                        setCreateIngredientState({
                          rowKey: row.key,
                          initialName: searchTerm,
                        });
                      }}
                      allowClear
                      clearLabel="Clear ingredient"
                    />
                  </div>

                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
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
                      <SelectTrigger className="min-w-0">
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
                    aria-label="Remove ingredient row"
                    onClick={() => handleRemoveRow(row.key)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

            <Button type="button" variant="outline" onClick={handleAddRow}>
              <Plus className="h-4 w-4" />
              Add ingredient
            </Button>
          </section>
        </div>

        <DialogFooter className="px-6 py-4 flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || Boolean(createIngredientState)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || Boolean(createIngredientState)}
          >
            {isSaving ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
      {ingredientFormDependencies ? (
        <CreateIngredientDialog
          open={Boolean(createIngredientState)}
          initialName={createIngredientState?.initialName}
          onOpenChange={(open) => {
            if (!open) {
              setCreateIngredientState(null);
            }
          }}
          onCreated={(createdIngredient) => {
            const mappedIngredient = mapIngredientToLogOption(createdIngredient);
            setLocalIngredientOptions((prev) =>
              prev.some((item) => item.id === mappedIngredient.id)
                ? prev
                : [...prev, mappedIngredient],
            );

            const rowKey = createIngredientState?.rowKey;
            if (!rowKey) {
              toast.error("Could not apply created ingredient to row");
              setCreateIngredientState(null);
              return;
            }

            const defaultUnitId = getDefaultUnitIdForIngredient({
              defaultUnitId: mappedIngredient.defaultUnitId,
              unitConversions: mappedIngredient.unitConversions.map((unit) => ({
                unitId: unit.unitId,
                unit: { name: unit.unitName },
              })),
            });

            const rowExists = rows.some((item) => item.key === rowKey);
            if (!rowExists) {
              toast.error("Could not apply created ingredient to row");
              setCreateIngredientState(null);
              return;
            }

            setRows((prev) =>
              prev.map((item) =>
                item.key === rowKey
                  ? {
                      ...item,
                      ingredientId: mappedIngredient.id,
                      unitId: defaultUnitId,
                    }
                  : item,
              ),
            );
            setCreateIngredientState(null);
            toast.success("Ingredient created and selected");
          }}
          categories={ingredientFormDependencies.categories}
          units={ingredientFormDependencies.units}
          gramsUnitId={ingredientFormDependencies.gramsUnitId}
          iconOptions={ingredientFormDependencies.iconOptions}
        />
      ) : null}
    </Dialog>
  );
}
