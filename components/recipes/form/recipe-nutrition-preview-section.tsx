"use client";

import { Badge } from "@/components/ui/badge";
import type { NutritionPerPortion } from "@/lib/recipes/helpers";
import {
  NutritionPersonCard,
  NutritionPersonSummaryRow,
} from "@/components/recipes/nutrition-person-summary";
import { Subheader } from "@/components/recipes/recipe-page/subheader";

type RecipeNutritionPreviewSectionProps = {
  jagoda: NutritionPerPortion;
  nelson: NutritionPerPortion;
};

/**
 * Read-only Jagoda/Nelson macro preview used on the recipe editor — mirrors nutrition math from the recipe page
 * without calorie targets or scaling inputs (see `calculateNutritionPerServing` parity in plan).
 */
export function RecipeNutritionPreviewSection({
  jagoda,
  nelson,
}: RecipeNutritionPreviewSectionProps) {
  return (
    <section>
      <div className="mb-3">
        <Subheader>Nutrition preview</Subheader>
      </div>

      {/* Live totals for screen readers as the user edits ingredients / portions */}
      <div
        aria-live="polite"
        aria-label="Estimated nutrition preview by person"
        className="section-container flex flex-col gap-item"
      >
        {/* Jagoda row — four secondary badges total (calories + macros). */}
        <NutritionPersonCard>
          <NutritionPersonSummaryRow
            personLabel="Jagoda"
            caloriesArea={
              <Badge variant="secondary">{jagoda.calories} kcal</Badge>
            }
            protein={jagoda.protein}
            fat={jagoda.fat}
            carbs={jagoda.carbs}
          />
        </NutritionPersonCard>

        <NutritionPersonCard>
          <NutritionPersonSummaryRow
            personLabel="Nelson"
            caloriesArea={
              <Badge variant="secondary">{nelson.calories} kcal</Badge>
            }
            protein={nelson.protein}
            fat={nelson.fat}
            carbs={nelson.carbs}
          />
        </NutritionPersonCard>
      </div>
    </section>
  );
}
