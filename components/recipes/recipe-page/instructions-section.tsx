import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import { useState } from "react";
import {
  formatIngredientAmount,
  formatInstructionIngredientBadge,
  getIngredientDisplay,
  getInstructionIngredientPersonFactor,
  isGramUnit,
  isInstructionIngredientVisibleForPerson,
} from "@/lib/recipes/helpers";
import { useRecipePageInstructionsSectionData } from "@/components/context/recipe-page-context";
import { Subheader } from "@/components/recipes/recipe-page/subheader";

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
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);

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
    // Shared section container utility keeps card shell styling consistent.
    <div className="section-container">
      <div className="mb-item flex flex-wrap items-center justify-between gap-item">
        <Subheader>Instructions</Subheader>
        {/* Keep this local segmented control aligned with existing button-group patterns. */}
        <div
          className="flex items-center gap-item"
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
                size="default"
                role="radio"
                aria-checked={isSelected}
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
      <ol className="flex flex-col gap-item">
        {instructions.map((instruction, index) => {
          const isSelected = selectedInstructionId === instruction.id;

          return (
          <li
            key={instruction.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={(event) => {
              // Keep markdown links functional without toggling the selected step.
              if ((event.target as HTMLElement).closest("a")) {
                return;
              }
              setSelectedInstructionId(instruction.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }
              event.preventDefault();
              setSelectedInstructionId(instruction.id);
            }}
            className={`flex items-start gap-item rounded-lg border p-nest cursor-pointer transition-colors ${
              isSelected
                ? "border-border/60 bg-muted/60"
                : "border-border/60 bg-card hover:bg-muted/40"
            }`}
          >
            {/* Increase active-state contrast so step index remains visible on selection. */}
            <div
              className={`self-start flex size-5 shrink-0 items-center justify-center rounded-full ${
                isSelected ? "bg-foreground" : "bg-muted"
              }`}
            >
              <div
                className={`type-micro ${
                  isSelected ? "text-background" : "text-secondary-foreground"
                }`}
              >
                {index + 1}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-item">
              <div className="type-body text-foreground">
                {renderTextWithMarkdownLinks(
                  instruction.text,
                  `instruction-${instruction.id}`,
                )}
              </div>

              {instruction.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-item">
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
                      // Recipe pages should keep instruction badges to the ingredient name only.
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
                        variant="secondary"
                        // Make badges more prominent inside the selected step.
                        className={isSelected ? "bg-background border-foreground/20" : undefined}
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
        )})}
      </ol>
    </div>
  );
}
