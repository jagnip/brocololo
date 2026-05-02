"use client";
import {
  createRecipeSchema,
  updateRecipeSchema,
  CreateRecipeFormValues,
  CreateRecipePayload,
  UpdateRecipePayload,
} from "@/lib/validations/recipe";
import { toast } from "sonner";
import { Resolver, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormLabel,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { CategoryType } from "@/types/category";
import { Button } from "../../ui/button";
import {
  createRecipeAction,
  deleteRecipeAction,
  updateRecipeAction,
} from "@/actions/recipe-actions";
import { ImageUploader } from "./image-uploader";
import { RecipeType } from "@/types/recipe";
import {
  calculateNutritionPerServing,
  formatIngredientAmount,
  formatIngredientLabel,
  getUnitDisplayName,
  recipeToFormData,
  toSentenceCaseIngredientName,
} from "@/lib/recipes/helpers";
import { buildDraftRecipeForNutrition } from "@/lib/recipes/build-draft-recipe-for-nutrition";
import { IngredientType } from "@/types/ingredient";
import { IngredientSelector } from "./ingredient-selector";
import { Checkbox } from "@/components/ui/checkbox";
import { InstructionStepsEditor } from "./instruction-steps-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { CreateIngredientDialog } from "./create-ingredient-dialog";
import { EditIngredientDialog } from "./edit-ingredient-dialog";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { reconcileIngredientUnitsAfterUpdate } from "./ingredient-row-adjustments";
import { Label } from "@/components/ui/label";
import { TopbarConfigController } from "@/components/topbar-config";
import { Trash2 } from "lucide-react";
import { Subheader } from "../recipe-page/subheader";
import MultipleSelector from "@/components/ui/multiselect";
import { RecipeNutritionPreviewSection } from "./recipe-nutrition-preview-section";

type RecipeFormProps = {
  categories: CategoryType[];
  ingredients: IngredientType[];
  ingredientFormDependencies: {
    categories: Array<{ id: string; name: string }>;
    units: Array<{ id: string; name: string; namePlural: string | null }>;
    gramsUnitId: string;
    iconOptions: string[];
  };
  recipe?: RecipeType;
};

export function sanitizeInstructionRows<
  T extends { text: string; linkedTempIngredientKeys?: string[]; id?: string },
>(rows: T[]): T[] {
  // Remove placeholder rows that have no meaningful instruction text.
  return rows.filter((row) => row.text.trim().length > 0);
}

export function sanitizeRecipeFormValuesForSubmit(
  values: Pick<
    CreateRecipeFormValues,
    "instructions" | "ingredients" | "ingredientGroups"
  >,
) {
  const ingredientGroups = values.ingredientGroups ?? [];
  const sanitizedIngredientGroups = ingredientGroups.filter(
    (group) => group.name.trim().length > 0,
  );
  const validGroupKeys = new Set(
    sanitizedIngredientGroups.map((group) => group.tempGroupKey),
  );

  return {
    ingredientGroups: sanitizedIngredientGroups,
    // Drop placeholder rows with no selected ingredient; keep ingredient-only rows.
    ingredients: values.ingredients.filter(
      (row) => row.ingredientId.trim().length > 0,
    ).map((row) => ({
      ...row,
      // Ungroup rows that referenced groups removed by submit sanitization.
      groupTempKey:
        row.groupTempKey && validGroupKeys.has(row.groupTempKey)
          ? row.groupTempKey
          : null,
    })),
    instructions: sanitizeInstructionRows(values.instructions),
  };
}

export default function RecipeForm({
  categories,
  ingredients,
  ingredientFormDependencies,
  recipe,
}: RecipeFormProps) {
  // Keep delete confirmation local to the edit form state.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  // Keep categories local so newly created options appear instantly in selects.
  const [localCategories, setLocalCategories] = useState(categories);
  // Keep ingredients local so inline create/edit updates are immediately selectable.
  const [localIngredients, setLocalIngredients] = useState(ingredients);
  const [createIngredientState, setCreateIngredientState] = useState<{
    rowIndex: number;
    initialName: string;
  } | null>(null);
  const [editIngredientState, setEditIngredientState] = useState<{
    ingredientId: string;
  } | null>(null);
  const formSchema = recipe ? updateRecipeSchema : createRecipeSchema;
  const mealOccasionCategories = useMemo(
    () => localCategories.filter((category) => category.type === "MEAL_OCCASION"),
    [localCategories],
  );
  const proteinCategories = useMemo(
    () => localCategories.filter((category) => category.type === "PROTEIN"),
    [localCategories],
  );
  const recipeTypeCategories = useMemo(
    () => localCategories.filter((category) => category.type === "RECIPE_TYPE"),
    [localCategories],
  );
  // Keep option transformation memoized to avoid rebuilding arrays on every keypress.
  const proteinOptions = useMemo<SearchableSelectOption[]>(
    () =>
      proteinCategories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [proteinCategories],
  );
  const mealOccasionOptions = useMemo(
    () =>
      mealOccasionCategories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [mealOccasionCategories],
  );

  const getIngredientOptionLabel = (row: {
    ingredientId: string;
    unitId?: string | null;
    amount?: number | null;
    additionalInfo?: string | null;
  }) => {
    const ingredient = localIngredients.find(
      (ing) => ing.id === row.ingredientId,
    );
    const selectedUnit =
      ingredient?.unitConversions.find((unit) => unit.unitId === row.unitId)
        ?.unit ?? null;
    const ingredientName = ingredient
      ? toSentenceCaseIngredientName(ingredient.name)
      : "Select ingredient";
    // Keep amount labels consistent with recipe page formatting (no trailing .0).
    const amountLabel =
      row.amount == null ? null : formatIngredientAmount(row.amount, 2);
    const unitName = getUnitDisplayName({
      amount: row.amount,
      unitName: selectedUnit?.name ?? "",
      unitNamePlural: selectedUnit?.namePlural ?? null,
    });
    // Reuse the shared label formatter so badge wording stays consistent.
    return formatIngredientLabel({
      amountText: amountLabel,
      unitName,
      ingredientName,
      additionalInfo: row.additionalInfo,
    });
  };

  const form = useForm<CreateRecipeFormValues>({
    // Keep resolver type aligned to current form value shape.
    resolver: zodResolver(
      formSchema,
    ) as unknown as Resolver<CreateRecipeFormValues>,
    defaultValues: recipe
      ? recipeToFormData(recipe)
      : {
          name: "",
          mealOccasionCategoryIds: [],
          proteinCategoryId: null,
          typeCategoryId: null,
          images: [],
          // Keep targeted numeric fields empty so placeholders guide first input.
          // Start in no-group mode; grouping is optional.
          ingredientGroups: [],
          // Start with a clean slate; ingredients are optional.
          ingredients: [],
          // Start with a clean slate; instructions are optional.
          instructions: [],
          notes: "",
          excludeFromPlanner: false,
        },
  });

  // Live nutrition preview — subscribed fields only (see `buildDraftRecipeForNutrition`).
  const previewServings = useWatch({ control: form.control, name: "servings" });
  const previewMultiplier = useWatch({
    control: form.control,
    name: "servingMultiplierForNelson",
  });
  const previewIngredients =
    useWatch({ control: form.control, name: "ingredients" }) ?? [];

  const nutritionPreview = useMemo(() => {
    const draft = buildDraftRecipeForNutrition(
      previewServings,
      previewMultiplier ?? 1,
      previewIngredients,
      localIngredients,
    );
    return {
      jagoda: calculateNutritionPerServing(draft, "primary"),
      nelson: calculateNutritionPerServing(draft, "secondary"),
    };
  }, [
    previewServings,
    previewMultiplier,
    previewIngredients,
    localIngredients,
  ]);

  const handleNumericFieldChange = (
    onChange: (value: number | null) => void,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawValue = event.target.value;
    // Keep cleared values as null to avoid RHF falling back to default edit values.
    const nextValue = rawValue === "" ? null : Number(rawValue);
    onChange(nextValue);
  };
  // Restrict UI choices to the agreed segmented-button multipliers.
  const nelsonMultiplierOptions = [1, 1.5, 2, 2.5, 3] as const;

  useEffect(() => {
    // Sync local options if server-provided categories change.
    setLocalCategories(categories);
  }, [categories]);
  useEffect(() => {
    // Sync local ingredient options if server-provided ingredients change.
    setLocalIngredients(ingredients);
  }, [ingredients]);

  async function onSubmit(formData: CreateRecipeFormValues) {
    // zodResolver already transformed the data, so we can safely assert the type
    const transformed = recipe
      ? (formData as unknown as UpdateRecipePayload)
      : (formData as unknown as CreateRecipePayload);

    const result = recipe
      ? await updateRecipeAction(recipe.id, transformed)
      : await createRecipeAction(transformed);

    // Both actions redirect on success, so we only handle errors here
    if (result?.type === "error") {
      toast.error(result.message);
    }
  }

  function submitWithSanitizedInstructions() {
    const currentIngredientGroups = form.getValues("ingredientGroups") ?? [];
    const currentIngredients = form.getValues("ingredients") ?? [];
    const currentInstructions = form.getValues("instructions") ?? [];
    const {
      ingredientGroups: sanitizedIngredientGroups,
      ingredients: sanitizedIngredients,
      instructions: sanitizedInstructions,
    } = sanitizeRecipeFormValuesForSubmit({
      ingredientGroups: currentIngredientGroups,
      ingredients: currentIngredients,
      instructions: currentInstructions,
    });
    if (sanitizedIngredientGroups.length !== currentIngredientGroups.length) {
      form.setValue("ingredientGroups", sanitizedIngredientGroups, {
        shouldValidate: false,
        shouldDirty: true,
      });
    }
    if (sanitizedIngredients.length !== currentIngredients.length) {
      form.setValue("ingredients", sanitizedIngredients, {
        shouldValidate: false,
        shouldDirty: true,
      });
    } else {
      const changedGroupLinks = sanitizedIngredients.some(
        (row, index) => row.groupTempKey !== currentIngredients[index]?.groupTempKey,
      );
      if (changedGroupLinks) {
        form.setValue("ingredients", sanitizedIngredients, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    }
    if (sanitizedInstructions.length !== currentInstructions.length) {
      // Keep resolver input aligned with the payload by removing blank placeholders first.
      form.setValue("instructions", sanitizedInstructions, {
        shouldValidate: false,
        shouldDirty: true,
      });
    }
    void form.handleSubmit(onSubmit)();
  }

  function onConfirmDelete() {
    if (!recipe) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteRecipeAction(recipe.id);

      // Action redirects on success, so only show errors here.
      if (result?.type === "error") {
        toast.error(result.message);
        setIsDeleteOpen(false);
      }
    });
  }

  function handleIngredientCreated(createdIngredient: IngredientType) {
    setLocalIngredients((prev) => {
      // Avoid duplicate inserts if create callback fires more than once.
      if (prev.some((ingredient) => ingredient.id === createdIngredient.id)) {
        return prev;
      }
      return [...prev, createdIngredient].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    });

    if (!createIngredientState) {
      return;
    }

    const ingredientRows = form.getValues("ingredients");
    const row = ingredientRows[createIngredientState.rowIndex];
    if (!row) {
      return;
    }

    const fallbackUnitId = getDefaultUnitIdForIngredient({
      defaultUnitId: createdIngredient.defaultUnitId,
      unitConversions: createdIngredient.unitConversions,
    });

    ingredientRows[createIngredientState.rowIndex] = {
      ...row,
      ingredientId: createdIngredient.id,
      unitId: fallbackUnitId ?? null,
    };

    form.setValue("ingredients", ingredientRows, { shouldValidate: true });
    setCreateIngredientState(null);
  }

  function handleIngredientUpdated(updatedIngredient: IngredientType) {
    setLocalIngredients((prev) =>
      prev.map((ingredient) =>
        ingredient.id === updatedIngredient.id ? updatedIngredient : ingredient,
      ),
    );

    const ingredientRows = form.getValues("ingredients");
    const { rows, fixedRowsCount } = reconcileIngredientUnitsAfterUpdate({
      rows: ingredientRows,
      updatedIngredient,
    });

    form.setValue("ingredients", rows, { shouldValidate: true });
    if (fixedRowsCount > 0) {
      toast.info(
        `Updated ingredient changed available units. Auto-adjusted ${fixedRowsCount} row${fixedRowsCount > 1 ? "s" : ""}.`,
      );
    }
    setEditIngredientState(null);
  }

  const ingredientGroups = form.watch("ingredientGroups") ?? [];
  const recipeTypeOptions = useMemo<SearchableSelectOption[]>(
    () =>
      recipeTypeCategories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [recipeTypeCategories],
  );
  const isSubmitting = form.formState.isSubmitting;
  const isEditMode = Boolean(recipe);
  const topbarSubmitLabel = isSubmitting
    ? isEditMode
      ? "Editing..."
      : "Creating..."
    : isEditMode
      ? "Update recipe"
      : "Create recipe";

  return (
    <Form {...form}>
      <TopbarConfigController
        config={{
          actions: [
            {
              id: "submit-recipe",
              label: topbarSubmitLabel,
              onClick: () => {
                // Keep topbar action aligned with the form submit pipeline.
                submitWithSanitizedInstructions();
              },
              disabled: isSubmitting,
              ariaBusy: isSubmitting,
              variant: "default",
              size: "default",
            },
            ...(isEditMode
              ? [
                  {
                    id: "delete-recipe",
                    label: "Delete recipe",
                    onClick: () => {
                      // Keep delete confirmation flow centralized in the existing dialog state.
                      setIsDeleteOpen(true);
                    },
                    disabled: isDeleting,
                    ariaBusy: isDeleting,
                    ariaLabel: "Delete recipe",
                    icon: <Trash2 className="h-4 w-4" />,
                    variant: "outline" as const,
                    size: "icon" as const,
                  },
                ]
              : []),
          ],
        }}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitWithSanitizedInstructions();
        }}
        className="flex flex-col gap-6"
      >
        <section>
          <div className="mb-3">
            <Subheader>Basics</Subheader>
          </div>
          <div className="section-container">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-item lg:grid-cols-3 lg:items-end">
                <div className="lg:col-span-2">
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
                </div>
                <div className="hidden lg:block" aria-hidden />
              </div>

              <div className="grid grid-cols-1 gap-item md:grid-cols-3">
                <div>
                  <FormField
                    control={form.control}
                    name="handsOnTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hands-on time</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            // Keep explicit prompt text for blank numeric input.
                            placeholder="Enter hands on time"
                            // Keep controlled input behavior while still allowing an empty state.
                            value={(field.value as number | undefined) ?? ""}
                            onChange={(event) =>
                              handleNumericFieldChange(field.onChange, event)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="totalTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total time</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            // Keep explicit prompt text for blank numeric input.
                            placeholder="Enter total time"
                            // Keep controlled input behavior while still allowing an empty state.
                            value={(field.value as number | undefined) ?? ""}
                            onChange={(event) =>
                              handleNumericFieldChange(field.onChange, event)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="hidden md:block" aria-hidden />
              </div>

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photos (optional)</FormLabel>
                    <FormControl>
                      <ImageUploader
                        value={
                          field.value?.map((img) => ({
                            url: img.url,
                            isCover: img.isCover ?? false,
                          })) || []
                        }
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excludeFromPlanner"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          id="exclude-from-planner"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <Label
                        htmlFor="exclude-from-planner"
                        className="shrink-0 normal-case tracking-normal"
                      >
                        Exclude from planner
                      </Label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <Subheader>Categories</Subheader>
          </div>
          <div className="section-container">
            <div className="grid grid-cols-1 gap-item md:grid-cols-3">
              <FormField
                control={form.control}
                name="mealOccasionCategoryIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meals (optional)</FormLabel>
                    <FormControl>
                      <MultipleSelector
                        value={mealOccasionOptions.filter((option) =>
                          (field.value ?? []).includes(option.value),
                        )}
                        onChange={(options) =>
                          field.onChange(options.map((option) => option.value))
                        }
                        defaultOptions={mealOccasionOptions}
                        placeholder="Select meals"
                        emptyIndicator={
                          <p className="text-center text-sm text-muted-foreground">
                            No meal occasions found.
                          </p>
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="proteinCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protein (optional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={proteinOptions}
                        value={field.value}
                        onValueChange={(next) => field.onChange(next)}
                        placeholder="Select protein"
                        searchPlaceholder="Search proteins..."
                        emptyLabel="No protein found."
                        allowClear
                        clearLabel="Clear protein"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="typeCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe type (optional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={recipeTypeOptions}
                        value={field.value}
                        onValueChange={(next) => field.onChange(next)}
                        placeholder="Select recipe type"
                        searchPlaceholder="Search recipe types..."
                        emptyLabel="No recipe type found."
                        allowClear
                        clearLabel="Clear recipe type"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <Subheader>Portions</Subheader>
          </div>
          <div className="section-container">
            {/* Match Basics: `gap-3` between stacked field groups (same as name row → timing row). */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-item md:grid-cols-3">
                <div>
                  <FormField
                    control={form.control}
                    name="servings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portions</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={2}
                            step={2}
                            // Keep explicit prompt text for blank numeric input.
                            placeholder="Enter portions"
                            // Keep controlled input behavior while still allowing an empty state.
                            value={(field.value as number | undefined) ?? ""}
                            onChange={(event) =>
                              handleNumericFieldChange(field.onChange, event)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="hidden md:block" aria-hidden />
                <div className="hidden md:block" aria-hidden />
              </div>

              {/* One row per household member; add more columns here when multi-person UI ships. */}
              <FormField
                control={form.control}
                name="servingMultiplierForNelson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Serving multiplier
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-item">
                        <Label className="shrink-0 ">
                          Nelson
                        </Label>
                        <div
                          className="flex min-w-0 flex-1 flex-wrap gap-2"
                          role="radiogroup"
                          aria-label="Nelson serving multiplier"
                        >
                          {nelsonMultiplierOptions.map((multiplier) => {
                            // Keep the UI default selected at 1 without changing backend validation rules.
                            const selectedMultiplier =
                              (field.value as number | null | undefined) ?? 1;
                            const checked = selectedMultiplier === multiplier;
                            return (
                              <Button
                                key={multiplier}
                                type="button"
                                role="radio"
                                aria-checked={checked}
                                variant={checked ? "default" : "outline"}
                                onClick={() => field.onChange(multiplier)}
                              >
                                {multiplier}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="section-container min-w-0">
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                // min-w-0 lets the grid shrink on narrow viewports so flex children don’t force horizontal scroll.
                <FormItem className="min-w-0">
                  <FormControl>
                    <IngredientSelector
                      ingredients={localIngredients}
                      groups={ingredientGroups}
                      value={field.value}
                      onChange={field.onChange}
                      onGroupsChange={(nextGroups) => {
                        form.setValue("ingredientGroups", nextGroups, {
                          shouldValidate: true,
                        });
                      }}
                      onCreateIngredientRequested={(params) => {
                        setCreateIngredientState(params);
                      }}
                      onEditIngredientRequested={(params) => {
                        setEditIngredientState({ ingredientId: params });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <RecipeNutritionPreviewSection {...nutritionPreview} />

        <section>
          <div className="mb-3">
            <Subheader>Instructions</Subheader>
          </div>
          <div className="section-container">
            {/* Steps first, then notes — same vertical rhythm as Basics (`gap-3`). */}
            <div className="flex flex-col gap-3">
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => {
                  const ingredientRows = form.watch("ingredients");
                  const ingredientOptions = ingredientRows.map((row) => ({
                    tempIngredientKey: row.tempIngredientKey,
                    label: getIngredientOptionLabel(row),
                  }));

                  return (
                    <FormItem>
                      <FormControl>
                        <InstructionStepsEditor
                          value={field.value}
                          onChange={field.onChange}
                          ingredientOptions={ingredientOptions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    {/* Optional field marker keeps label-level guidance consistent. */}
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        {isEditMode ? (
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete recipe?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{" "}
                  <strong>{recipe?.name ?? "this recipe"}</strong>? This action
                  cannot be undone.
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
        ) : null}

        <CreateIngredientDialog
          open={Boolean(createIngredientState)}
          initialName={createIngredientState?.initialName}
          onOpenChange={(open) => {
            if (!open) {
              setCreateIngredientState(null);
            }
          }}
          onCreated={handleIngredientCreated}
          categories={ingredientFormDependencies.categories}
          units={ingredientFormDependencies.units}
          gramsUnitId={ingredientFormDependencies.gramsUnitId}
          iconOptions={ingredientFormDependencies.iconOptions}
        />

        <EditIngredientDialog
          open={Boolean(editIngredientState)}
          ingredient={
            editIngredientState
              ? localIngredients.find(
                  (ingredient) =>
                    ingredient.id === editIngredientState.ingredientId,
                )
              : undefined
          }
          onOpenChange={(open) => {
            if (!open) {
              setEditIngredientState(null);
            }
          }}
          onUpdated={handleIngredientUpdated}
          categories={ingredientFormDependencies.categories}
          units={ingredientFormDependencies.units}
          gramsUnitId={ingredientFormDependencies.gramsUnitId}
          iconOptions={ingredientFormDependencies.iconOptions}
        />
      </form>
    </Form>
  );
}
