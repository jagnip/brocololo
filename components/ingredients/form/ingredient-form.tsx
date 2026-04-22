"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  IngredientFormValues,
  makeIngredientSchema,
} from "@/lib/validations/ingredient";
import {
  createIngredientAction,
  createIngredientInlineAction,
  deleteIngredientAction,
  updateIngredientInlineAction,
  updateIngredientAction,
} from "@/actions/ingredient-actions";
import { IconPicker } from "./icon-picker";
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
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/searchable-select";
import type { IngredientType } from "@/types/ingredient";
import type { UnitType } from "@/types/unit";
import { MESSAGES } from "@/lib/messages";
import {
  buildDefaultUnitOptions,
  getFallbackUnitIdFromUnitIds,
} from "@/lib/ingredients/default-unit";
import { CreateUnitDialog } from "./create-unit-dialog";
import { RenameUnitDialog } from "./rename-unit-dialog";
import { Subheader } from "@/components/recipes/recipe-page/subheader";

type IngredientFormProps = {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; namePlural: string | null }>;
  gramsUnitId: string;
  iconOptions: string[];
  ingredient?: {
    id: string;
    name: string;
    brand: string | null;
    icon: string | null;
    supermarketUrl: string | null;
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
    categoryId: string;
    defaultUnitId: string | null;
    unitConversions: Array<{
      unitId: string;
      gramsPerUnit: number;
      unit: { id: string; name: string };
    }>;
  };
  mode?: "page" | "dialog";
  initialName?: string;
  onSubmitted?: (ingredient: IngredientType) => void;
  onCancel?: () => void;
};

export default function IngredientForm({
  categories,
  units,
  gramsUnitId,
  iconOptions,
  ingredient,
  mode = "page",
  initialName,
  onSubmitted,
  onCancel,
}: IngredientFormProps) {
  // Keep delete confirmation local to the edit form state.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // Keep a local unit list so inline unit creation is immediately selectable.
  const [availableUnits, setAvailableUnits] = useState(units);
  // Track the conversion row that requested creating a brand new unit.
  const [createUnitState, setCreateUnitState] = useState<{
    rowIndex: number;
    unitName: string;
  } | null>(null);
  const [renameUnitState, setRenameUnitState] = useState<{
    rowIndex: number;
    unit: UnitType;
  } | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const formSchema = useMemo(
    () => makeIngredientSchema(gramsUnitId),
    [gramsUnitId],
  );
  // Keep selector options stable to avoid unnecessary cmdk list rerenders.
  const categoryOptions = useMemo<SearchableSelectOption[]>(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories],
  );
  const unitOptions = useMemo<SearchableSelectOption[]>(
    () =>
      availableUnits.map((unit) => ({
        value: unit.id,
        label: unit.name,
      })),
    [availableUnits],
  );
  const nonGramsUnitOptions = useMemo<SearchableSelectOption[]>(
    () => unitOptions.filter((option) => option.value !== gramsUnitId),
    [unitOptions, gramsUnitId],
  );

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: ingredient
      ? {
          name: ingredient.name,
          brand: ingredient.brand,
          icon: ingredient.icon,
          supermarketUrl: ingredient.supermarketUrl,
          calories: ingredient.calories,
          proteins: ingredient.proteins,
          fats: ingredient.fats,
          carbs: ingredient.carbs,
          categoryId: ingredient.categoryId,
          defaultUnitId: ingredient.defaultUnitId,
          unitConversions: ingredient.unitConversions.map((conversion) => ({
            unitId: conversion.unitId,
            gramsPerUnit: conversion.gramsPerUnit,
          })),
        }
      : {
          // Prefill from selector create flow when provided.
          name: initialName ?? "",
          brand: null,
          icon: null,
          supermarketUrl: null,
          // Keep targeted nutrition fields empty so placeholders guide first input.
          categoryId: "",
          // Keep create flow deterministic with grams-first default.
          defaultUnitId: gramsUnitId,
          // Keep grams conversion in form state as canonical baseline.
          unitConversions: [{ unitId: gramsUnitId, gramsPerUnit: 1 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "unitConversions",
  });
  const watchedConversions =
    useWatch({
      control: form.control,
      name: "unitConversions",
    }) ?? [];

  const handleNutritionChange = (
    onChange: (value: number | null) => void,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawValue = event.target.value;
    // Keep cleared edit values as null to avoid RHF falling back to defaultValues in edit mode.
    const nextValue = rawValue === "" ? null : Number(rawValue);
    onChange(nextValue);
  };
  const defaultUnitOptions = useMemo<
    Array<{ value: string; label: string }>
  >(() => {
    // Keep options list in sync with current conversion rows.
    return buildDefaultUnitOptions({
      conversions: watchedConversions,
      units: availableUnits,
    });
  }, [availableUnits, watchedConversions]);

  useEffect(() => {
    // Sync local options when parent-provided dependency data changes.
    setAvailableUnits(units);
  }, [units]);

  useEffect(() => {
    const selectedDefaultUnitId = form.getValues("defaultUnitId") ?? null;
    const conversionUnitIds = watchedConversions
      .map((conversion) => conversion.unitId)
      .filter((unitId): unitId is string => Boolean(unitId));
    if (conversionUnitIds.length === 0) {
      if (selectedDefaultUnitId !== null) {
        form.setValue("defaultUnitId", null, { shouldValidate: true });
      }
      return;
    }
    if (
      selectedDefaultUnitId != null &&
      conversionUnitIds.includes(selectedDefaultUnitId)
    ) {
      return;
    }
    // Auto-heal invalid defaults after conversion row edits/removals.
    const nextDefaultUnitId = getFallbackUnitIdFromUnitIds({
      unitIds: conversionUnitIds,
      gramsUnitId,
    });
    form.setValue("defaultUnitId", nextDefaultUnitId, { shouldValidate: true });
  }, [form, gramsUnitId, watchedConversions]);

  async function onSubmit(values: IngredientFormValues) {
    const isDialogMode = mode === "dialog";
    const result = isDialogMode
      ? ingredient
        ? await updateIngredientInlineAction(ingredient.id, values)
        : await createIngredientInlineAction(values)
      : ingredient
        ? await updateIngredientAction(ingredient.id, values)
        : await createIngredientAction(values);

    // Page-mode actions redirect on success; dialog-mode returns a success payload.
    if (result?.type === "error") {
      toast.error(result.message);
      return;
    }

    if (isDialogMode && result?.type === "success") {
      if (result.conversionFallback) {
        // Explain automatic recipe rewrites when removed units were still in use.
        toast.success(
          `Updated ${result.conversionFallback.updatedRows} ingredient row(s) in ${result.conversionFallback.updatedRecipes} recipe(s) to grams.`,
        );
      }
      onSubmitted?.(result.ingredient);
    }
  }

  function onConfirmDelete() {
    if (!ingredient) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteIngredientAction(ingredient.id);

      // Action redirects on success, so only show errors here.
      if (result?.type === "error") {
        toast.error(result.message);
        setIsDeleteOpen(false);
      }
    });
  }
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          if (mode === "dialog") {
            // Prevent parent recipe form submission from nested dialog forms.
            event.preventDefault();
            event.stopPropagation();
          }
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-5"
      >
        <h1 className="text-2xl font-semibold">
          {ingredient ? "Edit ingredient" : "Create ingredient"}
        </h1>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tablet+ layout: brand/category share row at 50/50. */}
        {/* Keep mobile vertical rhythm consistent with the form's spacing scale. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-2">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand (optional)</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                    placeholder="e.g. Lidl, Tesco..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={categoryOptions}
                    value={field.value || null}
                    onValueChange={(next) => field.onChange(next ?? "")}
                    placeholder="Select category"
                    searchPlaceholder="Search categories..."
                    emptyLabel="No category found."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tablet+ layout: icon/url share row at 1/3 + 2/3. */}
        {/* Keep mobile vertical rhythm consistent with the form's spacing scale. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-2">
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
                {/* Optional field marker keeps label-level guidance consistent. */}
                <FormLabel>Icon (optional)</FormLabel>
                <FormControl>
                  <IconPicker
                    value={(field.value as string | null) ?? null}
                    onChange={field.onChange}
                    options={iconOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supermarketUrl"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                {/* Optional field marker keeps label-level guidance consistent. */}
                <FormLabel>Supermarket URL (optional)</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                    placeholder="https://..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Match mobile vertical rhythm used by other field groups. */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-5 md:grid-cols-4 md:gap-2">
          <FormField
            control={form.control}
            name="calories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calories</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01" // Allow entering nutrition values with two decimal places.
                    // Keep explicit prompt text for blank numeric input.
                    placeholder="Enter calories"
                    // Keep controlled input behavior while still allowing an empty state.
                    value={(field.value as number | undefined) ?? ""}
                    onChange={(event) =>
                      handleNutritionChange(field.onChange, event)
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="proteins"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proteins</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01" // Allow entering nutrition values with two decimal places.
                    // Keep explicit prompt text for blank numeric input.
                    placeholder="Enter proteins"
                    // Keep controlled input behavior while still allowing an empty state.
                    value={(field.value as number | undefined) ?? ""}
                    onChange={(event) =>
                      handleNutritionChange(field.onChange, event)
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fats"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fats</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01" // Allow entering nutrition values with two decimal places.
                    // Keep explicit prompt text for blank numeric input.
                    placeholder="Enter fats"
                    // Keep controlled input behavior while still allowing an empty state.
                    value={(field.value as number | undefined) ?? ""}
                    onChange={(event) =>
                      handleNutritionChange(field.onChange, event)
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="carbs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carbs</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01" // Allow entering nutrition values with two decimal places.
                    // Keep explicit prompt text for blank numeric input.
                    placeholder="Enter carbs"
                    // Keep controlled input behavior while still allowing an empty state.
                    value={(field.value as number | undefined) ?? ""}
                    onChange={(event) =>
                      handleNutritionChange(field.onChange, event)
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          {/* Match section heading style used across recipe-related forms. */}
          <Subheader className="mb-3">Unit conversions</Subheader>

          {fields.map((row, index) => {
            const selectedUnitId = form.watch(
              `unitConversions.${index}.unitId`,
            );
            const isGramsConversion = selectedUnitId === gramsUnitId;
            if (isGramsConversion) {
              // Keep canonical grams conversion hidden from manual editing.
              return null;
            }

            return (
              <div
                key={row.id}
                // Mobile: frame conversion controls as one card; md+: keep flat row layout.
                className="grid grid-cols-2 items-end gap-2 rounded-md md:grid-cols-4"
              >
                <div className="col-span-1 md:col-span-1">
                  <FormField
                    control={form.control}
                    name={`unitConversions.${index}.unitId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            // Hide grams from selectable options in editable rows.
                            options={nonGramsUnitOptions}
                            value={field.value || null}
                            onValueChange={(next) => field.onChange(next ?? "")}
                            onCreateOption={(typedName) => {
                              // Route creatable option into explicit confirmation dialog.
                              setCreateUnitState({
                                rowIndex: index,
                                unitName: typedName,
                              });
                            }}
                            placeholder="Select unit"
                            searchPlaceholder="Search units..."
                            emptyLabel="No unit found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1 md:col-span-1">
                  <FormField
                    control={form.control}
                    name={`unitConversions.${index}.gramsPerUnit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grams / 1 unit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.0001}
                            step="0.0001"
                            value={field.value as number}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2 flex items-end gap-2 md:col-span-2">
                  {/* Phone: actions on second row; md+: keep existing inline layout. */}
                  {mode === "page" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (!selectedUnitId) {
                          return;
                        }
                        const selectedUnit =
                          availableUnits.find(
                            (unit) => unit.id === selectedUnitId,
                          ) ?? null;
                        if (!selectedUnit) {
                          return;
                        }

                        setRenameUnitState({
                          rowIndex: index,
                          unit: selectedUnit,
                        });
                      }}
                      disabled={!selectedUnitId || selectedUnitId === gramsUnitId}
                      title={
                        !selectedUnitId
                          ? "Select a unit first"
                          : selectedUnitId === gramsUnitId
                            ? "Unit 'g' cannot be renamed"
                            : "Rename selected unit"
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {/* Prevent removing grams conversion directly in the form UI. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={isGramsConversion}
                    title={
                      isGramsConversion
                        ? "Cannot remove required grams conversion"
                        : "Remove conversion"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => append({ unitId: "", gramsPerUnit: 1 })}
          >
            Add conversion
          </Button>

          <FormField
            control={form.control}
            name="unitConversions"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="w-full md:w-1/4">
            <FormField
              control={form.control}
              name="defaultUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default unit</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(next) => field.onChange(next)}
                      disabled={defaultUnitOptions.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select default unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultUnitOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting
              ? ingredient
                ? MESSAGES.ingredient.updating
                : MESSAGES.ingredient.creating
              : ingredient
                ? "Update ingredient"
                : "Create ingredient"}
          </Button>

          {mode === "dialog" ? (
            // Keep escape hatch explicit for dialog flows.
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}

          {mode === "page" && ingredient ? (
            <>
              {/* Keep delete near update for edit-mode workflows. */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isDeleting}
                onClick={() => setIsDeleteOpen(true)}
                aria-label="Delete ingredient"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete ingredient?</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <strong>{ingredient.name}</strong>? This action cannot be
                      undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isDeleting}
                      onClick={() => setIsDeleteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={onConfirmDelete}
                    >
                      {isDeleting ? "Deleting..." : "Yes, delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
        </div>
      </form>

      <CreateUnitDialog
        open={Boolean(createUnitState)}
        unitName={createUnitState?.unitName ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setCreateUnitState(null);
          }
        }}
        onCreated={(createdUnit) => {
          // Merge and sort so the unit list stays deterministic after creation.
          setAvailableUnits((previousUnits) => {
            const alreadyExists = previousUnits.some(
              (unit) => unit.id === createdUnit.id,
            );
            if (alreadyExists) {
              return previousUnits;
            }

            return [...previousUnits, createdUnit].sort((a, b) =>
              a.name.localeCompare(b.name),
            );
          });

          if (createUnitState) {
            const conversionRows = form.getValues("unitConversions");
            if (createUnitState.rowIndex < conversionRows.length) {
              form.setValue(
                `unitConversions.${createUnitState.rowIndex}.unitId`,
                createdUnit.id,
                {
                  shouldDirty: true,
                  shouldValidate: true,
                },
              );
            }
            toast.success(`Unit "${createdUnit.name}" created`);
          }

          setCreateUnitState(null);
        }}
      />

      <RenameUnitDialog
        open={Boolean(renameUnitState)}
        unit={renameUnitState?.unit ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameUnitState(null);
          }
        }}
        onRenamed={(renamedUnit) => {
          // Update labels in-place while preserving selected IDs.
          setAvailableUnits((previousUnits) =>
            previousUnits
              .map((unit) => (unit.id === renamedUnit.id ? renamedUnit : unit))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );

          if (renameUnitState) {
            const conversionRows = form.getValues("unitConversions");
            if (renameUnitState.rowIndex < conversionRows.length) {
              form.setValue(
                `unitConversions.${renameUnitState.rowIndex}.unitId`,
                renamedUnit.id,
                {
                  shouldDirty: true,
                  shouldValidate: true,
                },
              );
            }
          }

          toast.success(`Unit renamed to "${renamedUnit.name}"`);
          setRenameUnitState(null);
        }}
      />
    </Form>
  );
}
