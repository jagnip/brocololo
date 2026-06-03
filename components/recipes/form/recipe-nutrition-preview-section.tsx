"use client";

import { Badge } from "@/components/ui/badge";
import {
  roundNutritionCalories,
  type NutritionPerPortion,
} from "@/lib/recipes/helpers";
import {
  NutritionPersonCard,
  NutritionPersonSummaryRow,
} from "@/components/recipes/nutrition-person-summary";
import { Subheader } from "@/components/recipes/recipe-page/subheader";

type RecipeNutritionPreviewSectionProps = {
  rows?: Array<{
    familyMemberId: string;
    label: string;
    nutrition: NutritionPerPortion;
  }>;
  jagoda?: NutritionPerPortion;
  nelson?: NutritionPerPortion;
};

/**
 * Read-only family-member macro preview used on the recipe editor — mirrors nutrition math from the recipe page
 * without calorie targets or scaling inputs (see `calculateNutritionPerServing` parity in plan).
 */
export function RecipeNutritionPreviewSection({
  rows,
  jagoda,
  nelson,
}: RecipeNutritionPreviewSectionProps) {
  const previewRows =
    rows ??
    [
      jagoda
        ? { familyMemberId: "family-self", label: "You", nutrition: jagoda }
        : null,
      nelson
        ? { familyMemberId: "family-member-1", label: "Family member", nutrition: nelson }
        : null,
    ].filter(
      (
        row,
      ): row is {
        familyMemberId: string;
        label: string;
        nutrition: NutritionPerPortion;
      } => row != null,
    );
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
        {previewRows.map((row) => (
          <NutritionPersonCard key={row.familyMemberId}>
            <NutritionPersonSummaryRow
              personLabel={row.label}
              caloriesArea={
                <Badge variant="secondary">
                  {roundNutritionCalories(row.nutrition.calories)} kcal
                </Badge>
              }
              protein={row.nutrition.protein}
              fat={row.nutrition.fat}
              carbs={row.nutrition.carbs}
            />
          </NutritionPersonCard>
        ))}
      </div>
    </section>
  );
}
