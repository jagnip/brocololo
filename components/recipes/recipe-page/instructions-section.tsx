import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import { useState } from "react";
import {
  formatIngredientAmount,
  formatInstructionIngredientBadge,
  getIngredientDisplay,
  getInstructionIngredientBadgeAmount,
  isGramUnit,
  isInstructionIngredientVisibleForPerson,
} from "@/lib/recipes/helpers";
import { useRecipePageInstructionsSectionData } from "@/components/context/recipe-page-context";
import { Subheader } from "@/components/recipes/recipe-page/subheader";

export function InstructionsSection() {
  const {
    instructions,
    familyMembers,
    audienceMembers,
    memberPortions,
    effectiveRecipeIngredientById,
    selectedInstructionFamilyMemberId,
    setSelectedInstructionFamilyMemberId,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageInstructionsSectionData();
  const cookingFamilyMemberIds = audienceMembers.map(
    (member) => member.familyMemberId,
  );
  const showPersonFilter = familyMembers.length > 1;
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
        {/* Hide person filter when the recipe audience is a single cook. */}
        {showPersonFilter ? (
          <div
            className="flex items-center gap-item"
            role="radiogroup"
            aria-label="Instruction person filter"
          >
            {familyMembers.map((member, index) => {
              const isSelected =
                selectedInstructionFamilyMemberId === member.id;
              const label =
                member.name.trim() ||
                (member.isSelf ? "You" : `Family member ${index}`);
              return (
                <Button
                  key={member.id}
                  type="button"
                  size="default"
                  role="radio"
                  aria-checked={isSelected}
                  variant="outline"
                  onClick={() =>
                    setSelectedInstructionFamilyMemberId((prev) =>
                      prev === member.id ? null : member.id,
                    )
                  }
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
        ) : null}
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
                        recipeIngredient.appliesToEveryone,
                        recipeIngredient.memberTargets.map(
                          (target) => target.familyMemberId,
                        ),
                        selectedInstructionFamilyMemberId,
                      )
                    ) {
                      return null;
                    }
                    const selectedUnitId =
                      selectedUnits[recipeIngredient.id] ||
                      recipeIngredient.unit?.id ||
                      null;
                    const rowScaleFactor =
                      getIngredientDisplayScalingFactor(recipeIngredient.id) *
                      getIngredientCalorieFactor(recipeIngredient);
                    const badgeAmount = getInstructionIngredientBadgeAmount({
                      amount: recipeIngredient.amount,
                      appliesToEveryone: recipeIngredient.appliesToEveryone,
                      targetFamilyMemberIds:
                        recipeIngredient.memberTargets.map(
                          (target) => target.familyMemberId,
                        ),
                      selectedFamilyMemberId:
                        selectedInstructionFamilyMemberId,
                      familyMembers,
                      memberPortions,
                      cookingFamilyMemberIds,
                      rowScaleFactor,
                    });
                    if (badgeAmount == null) {
                      return null;
                    }
                    const display = getIngredientDisplay(
                      badgeAmount,
                      recipeIngredient.unit?.id ?? null,
                      recipeIngredient.unit?.name ?? null,
                      selectedUnitId,
                      recipeIngredient.ingredient.unitConversions,
                      1,
                      1,
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
