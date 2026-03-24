import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import {
  formatInstructionIngredientBadge,
  getIngredientDisplay,
  getInstructionIngredientPersonFactor,
  isInstructionIngredientVisibleForPerson,
} from "@/lib/recipes/helpers";
import { useRecipePageInstructionsSectionData } from "@/components/context/recipe-page-context";

export function InstructionsSection() {
  const {
    instructions,
    effectiveRecipeIngredientById,
    selectedInstructionPerson,
    setSelectedInstructionPerson,
    selectedUnits,
    jagodaPortionFactor,
    nelsonPortionFactor,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageInstructionsSectionData();

  const renderTextWithMarkdownLinks = (text: string, keyPrefix: string) =>
    // Keep markdown-link rendering local to this section now that data comes from context.
    parseMarkdownLinks(text).map((segment, index) => {
      if (segment.type === "link") {
        return (
          <a
            key={`${keyPrefix}-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all"
          >
            {segment.label}
          </a>
        );
      }

      return <span key={`${keyPrefix}-${index}`}>{segment.content}</span>;
    });

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
