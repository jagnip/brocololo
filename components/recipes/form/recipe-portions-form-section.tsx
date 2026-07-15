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
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { scaleFormIngredientRowsForNewServings } from "@/lib/recipes/scale-form-ingredient-rows-for-servings";

type RecipePortionsFormSectionProps = {
  form: UseFormReturn<CreateRecipeFormValues>;
  recipe?: RecipeType;
  onNumericServingsChange: (
    onChange: (value: number | null) => void,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
};

/** Portions (servings) only — per-person appetite multipliers are not used. */
export function RecipePortionsFormSection({
  form,
  recipe,
  onNumericServingsChange,
}: RecipePortionsFormSectionProps) {
  const servings = useWatch({ control: form.control, name: "servings" });
  const ingredients = useWatch({ control: form.control, name: "ingredients" }) ?? [];

  const servingsHint =
    "How many meals this batch covers.";

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
        </div>
      </div>
    </section>
  );
}
