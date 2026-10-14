import { useState } from "react";
import { Heart, Minus, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  useRecipePageBaseData,
  useRecipePageNutritionSectionData,
} from "@/components/context/recipe-page-context";
import { EditableCaloriesField } from "@/components/recipes/editable-calories-field";
import { NutritionPersonSummaryRow } from "@/components/recipes/nutrition-person-summary";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { cn } from "@/lib/utils";

function caloriesAriaLabel(personLabel: string): string {
  return `Calories per portion for ${personLabel}`;
}

const preferenceDisplay = {
  AVOID: { label: "Avoid", icon: ThumbsDown },
  NEUTRAL: { label: "Neutral", icon: Minus },
  LIKE: { label: "Like", icon: ThumbsUp },
  LOVE: { label: "Love", icon: Heart },
} as const;

export function PeopleSection() {
  const { recipe, familyMembers } = useRecipePageBaseData();
  const {
    calorieTarget,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  } = useRecipePageNutritionSectionData();
  const [focusedCaloriesMemberId, setFocusedCaloriesMemberId] = useState<
    string | null
  >(null);

  const handleNutritionReset = () => {
    onNutritionReset();
    // Unfocus so calculated kcal placeholders are visible again after reset.
    setFocusedCaloriesMemberId(null);
  };

  return (
    <section aria-label="People">
      <div className="mb-item flex items-center gap-item">
        <Subheader>People</Subheader>
        <Button
          // Match ingredients reset and other outlined icon buttons.
          variant="outline"
          size="icon-sm"
          onClick={handleNutritionReset}
          aria-label="Reset nutrition to default"
          aria-hidden={!hasActiveNutritionScaling}
          tabIndex={hasActiveNutritionScaling ? 0 : -1}
          className={cn(
            !hasActiveNutritionScaling && "pointer-events-none invisible",
          )}
        >
          <RotateCcw />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {familyMembers.map((member, index) => {
          const name = member.name.trim() || (member.isSelf ? "You" : `Family member ${index}`);
          const row = nutritionRows.find((row) => row.familyMemberId === member.id);
          const preference = recipe.memberPreferences.find((row) => row.familyMemberId === member.id)?.preference ?? "NEUTRAL";
          const { label, icon: PreferenceIcon } = preferenceDisplay[preference];
          const isAnchor = calorieTarget?.familyMemberId === member.id;
          const isFocused = focusedCaloriesMemberId === member.id;

          return (
            <Card
              key={member.id}
              role="group"
              aria-label={name}
              className="gap-item rounded-md p-4 shadow-none transition-colors hover:bg-muted/40 focus-within:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-item">
                <span className="type-body min-w-0 break-words font-medium">{name}</span>
                <Badge
                  variant="secondary"
                  className="shrink-0 text-muted-foreground"
                  aria-label={`Recipe preference: ${label}`}
                >
                  <PreferenceIcon aria-hidden="true" className="size-3" />
                  {label}
                </Badge>
              </div>
              {row ? (
                  <NutritionPersonSummaryRow
                    caloriesArea={
                      <EditableCaloriesField
                        ariaLabel={caloriesAriaLabel(name)}
                        value={
                          isAnchor && calorieTarget ? calorieTarget.calories : null
                        }
                        placeholder={isFocused ? "" : row.nutrition.calories.toString()}
                        onChange={(value) =>
                          onCaloriesChange(row.familyMemberId, value)
                        }
                        onFocus={() =>
                          setFocusedCaloriesMemberId(row.familyMemberId)
                        }
                        onBlur={() => setFocusedCaloriesMemberId(null)}
                      />
                    }
                    protein={row.nutrition.protein}
                    fat={row.nutrition.fat}
                    carbs={row.nutrition.carbs}
                  />
              ) : (
                <p className="type-caption text-muted-foreground">Not included in Cooking For</p>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
