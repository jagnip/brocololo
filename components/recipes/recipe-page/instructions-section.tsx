import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatInstructionIngredientBadge,
  getIngredientDisplay,
  getInstructionIngredientPersonFactor,
  isInstructionIngredientVisibleForPerson,
} from "@/lib/recipes/helpers";
import type { RecipeType } from "@/types/recipe";
import type { Dispatch, SetStateAction } from "react";

type InstructionsSectionProps = {
  instructions: RecipeType["instructions"];
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  selectedInstructionPerson: "jagoda" | "nelson" | null;
  setSelectedInstructionPerson: Dispatch<
    SetStateAction<"jagoda" | "nelson" | null>
  >;
  selectedUnits: Record<string, string | null>;
  jagodaPortionFactor: number;
  nelsonPortionFactor: number;
  getIngredientDisplayScalingFactor: (recipeIngredientId: string) => number;
  getIngredientCalorieFactor: (
    nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY",
  ) => number;
  renderTextWithMarkdownLinks: (text: string, keyPrefix: string) => React.ReactNode[];
};

export function InstructionsSection({
  instructions,
  effectiveRecipeIngredientById,
  selectedInstructionPerson,
  setSelectedInstructionPerson,
  selectedUnits,
  jagodaPortionFactor,
  nelsonPortionFactor,
  getIngredientDisplayScalingFactor,
  getIngredientCalorieFactor,
  renderTextWithMarkdownLinks,
}: InstructionsSectionProps) {
  if (!instructions || instructions.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Instructions</h3>
        {/* Keep this local segmented control aligned with existing button-group patterns. */}
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Instruction person filter"
        >
          {(["jagoda", "nelson"] as const).map((person) => {
            const isSelected = selectedInstructionPerson === person;
            const label = person === "jagoda" ? "Jagoda" : "Nelson";
            return (
              <Button
                key={person}
                type="button"
                size="sm"
                role="radio"
                aria-checked={isSelected}
                variant={isSelected ? "default" : "outline"}
                onClick={() =>
                  setSelectedInstructionPerson((prev) =>
                    prev === person ? null : person,
                  )
                }
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>
      <ol className="list-decimal list-inside space-y-2 text-sm">
        {instructions.map((instruction) => (
          <li key={instruction.id}>
            <div>
              {renderTextWithMarkdownLinks(
                instruction.text,
                `instruction-${instruction.id}`,
              )}
            </div>
            {instruction.ingredients.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {instruction.ingredients.map((link) => {
                  const recipeIngredient =
                    effectiveRecipeIngredientById.get(
                      link.recipeIngredient.id,
                    ) ?? link.recipeIngredient;
                  // Filter instruction badges by selected person, but keep step text visible.
                  if (
                    !isInstructionIngredientVisibleForPerson(
                      recipeIngredient.nutritionTarget,
                      selectedInstructionPerson,
                    )
                  ) {
                    return null;
                  }
                  const selectedUnitId =
                    selectedUnits[recipeIngredient.id] ||
                    recipeIngredient.unit?.id ||
                    null;
                  const personFactor = getInstructionIngredientPersonFactor(
                    recipeIngredient.nutritionTarget,
                    selectedInstructionPerson,
                    jagodaPortionFactor,
                    nelsonPortionFactor,
                  );
                  const display = getIngredientDisplay(
                    recipeIngredient.amount,
                    recipeIngredient.unit?.id ?? null,
                    recipeIngredient.unit?.name ?? null,
                    selectedUnitId,
                    recipeIngredient.ingredient.unitConversions,
                    getIngredientDisplayScalingFactor(recipeIngredient.id) *
                      personFactor,
                    getIngredientCalorieFactor(recipeIngredient.nutritionTarget),
                  );

                  return (
                    <Badge
                      key={`${instruction.id}-${recipeIngredient.id}`}
                      variant="outline"
                    >
                      {formatInstructionIngredientBadge({
                        rawAmount: display.rawAmount,
                        rawAmountInGrams: display.rawAmountInGrams,
                        displayAmount: display.displayAmount,
                        displayUnitName: display.displayUnitName,
                        displayUnitNamePlural: display.displayUnitNamePlural,
                        ingredientName:
                          recipeIngredient.ingredient.name,
                        additionalInfo: recipeIngredient.additionalInfo,
                      })}
                    </Badge>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
