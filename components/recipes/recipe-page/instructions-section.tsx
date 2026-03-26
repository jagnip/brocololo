import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import {
  formatIngredientAmount,
  formatInstructionIngredientBadge,
  getIngredientDisplay,
  getInstructionIngredientPersonFactor,
  isGramUnit,
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
    <div className="rounded-xl bg-card antialiased">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base leading-5 font-semibold text-foreground">
          Instructions
        </h3>
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
                // Paper-like segmented control: filled for selected, outlined for unselected.
                variant="outline"
                onClick={() =>
                  setSelectedInstructionPerson((prev) =>
                    prev === person ? null : person,
                  )
                }
                // Build classes without empty entries.
                className={`${
                  isSelected
                    ? "bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background"
                    : "bg-background text-foreground"
                }`}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>
      <ol className="flex flex-col gap-2.5">
        {instructions.map((instruction, index) => (
          <li
            key={instruction.id}
            className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5"
          >
            {/* Paper-like step number circle */}
            <div className="self-start flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
              <div className="text-[10px] leading-none font-medium text-muted-foreground">
                {index + 1}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="text-sm leading-5 text-foreground">
                {renderTextWithMarkdownLinks(
                  instruction.text,
                  `instruction-${instruction.id}`,
                )}
              </div>

              {instruction.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
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
                      getIngredientCalorieFactor(
                        recipeIngredient.nutritionTarget,
                      ),
                    );
                    const fullBadgeLabel = formatInstructionIngredientBadge({
                      rawAmount: display.rawAmount,
                      rawAmountInGrams: display.rawAmountInGrams,
                      displayAmount: display.displayAmount,
                      displayUnitName: display.displayUnitName,
                      displayUnitNamePlural: display.displayUnitNamePlural,
                      ingredientName: recipeIngredient.ingredient.name,
                      additionalInfo: recipeIngredient.additionalInfo,
                    });
                    const shouldShowMutedGrams =
                      display.rawAmountInGrams != null &&
                      !isGramUnit(display.displayUnitName);
                    // Narrow nullable grams value once to satisfy strict TS checks.
                    const gramsValue = shouldShowMutedGrams
                      ? display.rawAmountInGrams
                      : null;
                    const compactGramsText =
                      gramsValue == null
                        ? null
                        : gramsValue > 0 && gramsValue < 0.1
                          ? "<0.1g"
                          : `${formatIngredientAmount(gramsValue, 2)}g`;
                    // Keep existing amount/unit/name formatting and split grams into a muted tail.
                    const baseBadgeLabel =
                      shouldShowMutedGrams && compactGramsText
                        ? fullBadgeLabel.replace(` (${compactGramsText})`, "")
                        : fullBadgeLabel;
                    const mutedGramsLabel =
                      shouldShowMutedGrams && compactGramsText
                        ? `· ${compactGramsText.replace(/g$/, " g")}`
                        : null;

                    return (
                      <Badge
                        key={`${instruction.id}-${recipeIngredient.id}`}
                        variant="outline"
                      >
                        <span>{baseBadgeLabel}</span>
                        {mutedGramsLabel ? (
                          <span className="text-muted-foreground">
                            {mutedGramsLabel}
                          </span>
                        ) : null}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
