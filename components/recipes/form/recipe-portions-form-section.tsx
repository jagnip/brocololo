"use client";

import { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { CreateRecipeFormValues } from "@/lib/validations/recipe";
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
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { scaleFormIngredientRowsForNewServings } from "@/lib/recipes/scale-form-ingredient-rows-for-servings";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type RecipePortionsFormSectionProps = {
  form: UseFormReturn<CreateRecipeFormValues>;
  recipe?: RecipeType;
  familyMembers: FamilyMemberRow[];
  multiplierOptions: readonly number[];
  onNumericServingsChange: (
    onChange: (value: number | null) => void,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
};

/**
 * Portions (servings) + family-member multipliers, plus optional “Recalculate ingredients” when
 * the servings field diverges from the servings count current row amounts were written for.
 */
export function RecipePortionsFormSection({
  form,
  recipe,
  familyMembers,
  multiplierOptions,
  onNumericServingsChange,
}: RecipePortionsFormSectionProps) {
  const servings = useWatch({ control: form.control, name: "servings" });
  const ingredients = useWatch({ control: form.control, name: "ingredients" }) ?? [];

  // Anchor: ingredient amounts in the form are expressed for this many portions until the user recalculates.
  const [amountsBaselineServings, setAmountsBaselineServings] = useState<
    number | undefined
  >(() => (recipe ? recipe.servings : undefined));

  // Edit: always realign baseline with persisted recipe when slug/recipe payload changes.
  useEffect(() => {
    if (recipe) {
      setAmountsBaselineServings(recipe.servings);
    }
  }, [recipe?.id, recipe?.servings]);

  // Create: lock baseline the first time portions become a valid even integer (matches validation intent).
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
    if (servings < 1) {
      return false;
    }
    return true;
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

  return (
    <section>
      <div className="mb-3">
        <Subheader>Portions</Subheader>
      </div>
      <div className="section-container">
        {/* Match Basics: `gap-3` between stacked field groups (same as name row → timing row). */}
        <div className="flex flex-col gap-3">
          {/* Small: input + button same row (`1fr` + auto); `md+`: same 3-column rhythm as Categories. */}
          <FormField
            control={form.control}
            name="servings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portions</FormLabel>
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
            render={({ field }) => {
              const nonSelfMembers = familyMembers.filter((member) => !member.isSelf);
              return (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Serving multipliers
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      {nonSelfMembers.map((member, index) => {
                        const selectedMultiplier =
                          field.value?.find(
                            (portion) => portion.familyMemberId === member.id,
                          )?.multiplier ?? 1;
                        const label =
                          member.name.trim() || `Family member ${index + 1}`;
                        return (
                          <div
                            key={member.id}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-item"
                          >
                            <Label className="shrink-0">{label}</Label>
                            <div
                              className="flex min-w-0 flex-1 flex-wrap gap-2"
                              role="radiogroup"
                              aria-label={`${label} serving multiplier`}
                            >
                              {multiplierOptions.map((multiplier) => {
                                const checked = selectedMultiplier === multiplier;
                                return (
                                  <Button
                                    key={multiplier}
                                    type="button"
                                    role="radio"
                                    aria-checked={checked}
                                    variant={checked ? "default" : "outline"}
                                    onClick={() => {
                                      const current = field.value ?? [];
                                      const withoutMember = current.filter(
                                        (portion) =>
                                          portion.familyMemberId !== member.id,
                                      );
                                      field.onChange([
                                        ...withoutMember,
                                        {
                                          familyMemberId: member.id,
                                          multiplier,
                                        },
                                      ]);
                                    }}
                                  >
                                    {multiplier}
                                  </Button>
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
              );
            }}
          />
        </div>
      </div>
    </section>
  );
}
