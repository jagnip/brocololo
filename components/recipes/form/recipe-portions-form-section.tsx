"use client";

import { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { CreateRecipeFormValues } from "@/lib/validations/recipe";
import { PORTION_MULTIPLIER_OPTIONS } from "@/lib/validations/recipe";
import type { RecipeType } from "@/types/recipe";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { scaleFormIngredientRowsForNewServings } from "@/lib/recipes/scale-form-ingredient-rows-for-servings";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { syncModifyAmountsToPortionMultipliers } from "@/lib/recipes/sync-modify-amounts-for-portions";
import type { MemberPortionInput } from "@/lib/recipes/ingredient-adjustments";

function normalizeMemberPortionRows(
  rows: CreateRecipeFormValues["memberPortions"] | undefined,
): MemberPortionInput[] {
  return (rows ?? []).map((row) => ({
    familyMemberId: row.familyMemberId,
    multiplier:
      typeof row.multiplier === "number" && Number.isFinite(row.multiplier)
        ? row.multiplier
        : 1,
  }));
}

type RecipePortionsFormSectionProps = {
  form: UseFormReturn<CreateRecipeFormValues>;
  recipe?: RecipeType;
  familyMembers: FamilyMemberRow[];
  onNumericServingsChange: (
    onChange: (value: number | null) => void,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
};

/** Portions (servings) + per-person portion multipliers for the recipe. */
export function RecipePortionsFormSection({
  form,
  recipe,
  familyMembers,
  onNumericServingsChange,
}: RecipePortionsFormSectionProps) {
  const servings = useWatch({ control: form.control, name: "servings" });
  const ingredients = useWatch({ control: form.control, name: "ingredients" }) ?? [];

  const servingsHint = "How many meals this batch covers.";

  const [amountsBaselineServings, setAmountsBaselineServings] = useState<
    number | undefined
  >(() => (recipe ? recipe.servings : undefined));

  useEffect(() => {
    if (recipe) {
      setAmountsBaselineServings(recipe.servings);
    }
  }, [recipe?.id, recipe?.servings]);

  useEffect(() => {
    if (
      recipe ||
      amountsBaselineServings !== undefined ||
      typeof servings !== "number" ||
      !Number.isFinite(servings) ||
      servings < 1
    ) {
      return;
    }
    setAmountsBaselineServings(servings);
  }, [recipe, servings, amountsBaselineServings]);

  const canRecalculateIngredients = useMemo(() => {
    if (
      amountsBaselineServings == null ||
      typeof servings !== "number" ||
      !Number.isFinite(servings)
    ) {
      return false;
    }
    if (servings === amountsBaselineServings) {
      return false;
    }
    return servings >= 1;
  }, [amountsBaselineServings, servings]);

  function handleRecalculate() {
    if (
      !canRecalculateIngredients ||
      amountsBaselineServings == null ||
      typeof servings !== "number"
    ) {
      return;
    }
    const nextRows = scaleFormIngredientRowsForNewServings(
      ingredients,
      servings,
      amountsBaselineServings,
    );
    form.setValue("ingredients", nextRows, { shouldValidate: true, shouldDirty: true });
    setAmountsBaselineServings(servings);
  }

  function applyMemberPortionsChange(nextPortions: MemberPortionInput[]) {
    form.setValue("memberPortions", nextPortions, {
      shouldValidate: true,
      shouldDirty: true,
    });

    const currentServings = form.getValues("servings");
    const numericServings =
      typeof currentServings === "number" && Number.isFinite(currentServings)
        ? currentServings
        : 1;
    const currentIngredients = form.getValues("ingredients") ?? [];
    const syncedIngredients = syncModifyAmountsToPortionMultipliers(
      currentIngredients,
      nextPortions,
      numericServings,
    );
    form.setValue("ingredients", syncedIngredients, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  return (
    <section>
      <div className="mb-3">
        <Subheader>Portions</Subheader>
      </div>
      <div className="section-container">
        <div className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="servings"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  tooltip={servingsHint}
                  tooltipAriaLabel="Show portions guidance"
                >
                  Portions
                </FormLabel>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-item md:grid-cols-3">
                  <FormControl className="min-w-0 md:col-span-1">
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Enter portions"
                      value={(field.value as number | undefined) ?? ""}
                      onChange={(event) =>
                        onNumericServingsChange(field.onChange, event)
                      }
                    />
                  </FormControl>
                  <div className="flex min-w-0 items-center md:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 whitespace-nowrap"
                      disabled={!canRecalculateIngredients}
                      onClick={handleRecalculate}
                    >
                      Recalculate ingredients
                    </Button>
                  </div>
                  <div className="hidden md:col-span-1 md:block" aria-hidden />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="memberPortions"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  className="text-muted-foreground"
                  tooltip="How much each person eats from this recipe. Affects per-person amounts and nutrition — not the batch ingredient totals."
                  tooltipAriaLabel="Show portion multiplier guidance"
                >
                  Portion multiplier
                </FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    {familyMembers.map((member, index) => {
                      const currentPortions = normalizeMemberPortionRows(
                        field.value,
                      );
                      const selectedMultiplier =
                        currentPortions.find(
                          (portion) => portion.familyMemberId === member.id,
                        )?.multiplier ?? 1;
                      const label =
                        member.name.trim() ||
                        (member.isSelf ? "You" : `Family member ${index + 1}`);
                      return (
                        <div
                          key={member.id}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-item"
                        >
                          <Label className="shrink-0">{label}</Label>
                          <div
                            className="flex min-w-0 flex-1 flex-wrap gap-2"
                            role="radiogroup"
                            aria-label={`${label} portion multiplier`}
                          >
                            {PORTION_MULTIPLIER_OPTIONS.map((multiplier) => {
                              const checked = selectedMultiplier === multiplier;
                              return (
                                // Selected = accent shell (like Cooking for), not full primary.
                                <SegmentedFilterButton
                                  key={multiplier}
                                  type="button"
                                  role="radio"
                                  aria-checked={checked}
                                  selected={checked}
                                  onClick={() => {
                                    const withoutMember = currentPortions.filter(
                                      (portion) =>
                                        portion.familyMemberId !== member.id,
                                    );
                                    applyMemberPortionsChange([
                                      ...withoutMember,
                                      {
                                        familyMemberId: member.id,
                                        multiplier,
                                      },
                                    ]);
                                  }}
                                >
                                  {multiplier}
                                </SegmentedFilterButton>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </section>
  );
}
