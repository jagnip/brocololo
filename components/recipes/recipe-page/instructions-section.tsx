import { Badge } from "@/components/ui/badge";
import {
  SegmentedFilterButton,
  SegmentedFilterGroup,
} from "@/components/ui/segmented-filter-button";
import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import { useState } from "react";
import {
  getIngredientDisplay,
  getInstructionIngredientBadgeAmount,
  getInstructionIngredientBadgeParts,
  getInstructionIngredientBadgeTailSegments,
  isInstructionIngredientVisibleForPerson,
} from "@/lib/recipes/helpers";
import { useRecipePageInstructionsSectionData } from "@/components/context/recipe-page-context";
import { Subheader } from "@/components/recipes/recipe-page/subheader";

export function InstructionsSection() {
  const {
    instructions,
    familyMembers,
    recipeServings,
    audienceMemberIds,
    memberPortions,
    mealCount,
    cookingFamilyMemberIds,
    effectiveRecipeIngredientById,
    selectedInstructionFamilyMemberId,
    setSelectedInstructionFamilyMemberId,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageInstructionsSectionData();
  const showPersonFilter = familyMembers.length > 1;
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);

  const badgeMemberIds =
    selectedInstructionFamilyMemberId != null
      ? [selectedInstructionFamilyMemberId]
      : cookingFamilyMemberIds;

  const renderTextWithMarkdownLinks = (text: string, keyPrefix: string) =>
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
    <div className="section-container">
      <div className="mb-item flex flex-wrap items-center justify-between gap-item">
        <Subheader>Instructions</Subheader>
        {showPersonFilter ? (
          <SegmentedFilterGroup
            aria-label="Instruction person filter"
            className="max-md:basis-full"
          >
            {familyMembers.map((member, index) => {
              const isSelected =
                selectedInstructionFamilyMemberId === member.id;
              const label =
                member.name.trim() ||
                (member.isSelf ? "You" : `Family member ${index}`);
              return (
                <SegmentedFilterButton
                  key={member.id}
                  selected={isSelected}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() =>
                    setSelectedInstructionFamilyMemberId((prev) =>
                      prev === member.id ? null : member.id,
                    )
                  }
                >
                  {label}
                </SegmentedFilterButton>
              );
            })}
          </SegmentedFilterGroup>
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
              className={`group flex cursor-pointer items-start gap-item rounded-lg border p-nest transition-colors ${
                isSelected
                  ? "border-ring bg-accent/50"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div
                className={`flex size-5 shrink-0 items-center justify-center self-start rounded-full transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                }`}
              >
                <div className="type-micro font-bold">{index + 1}</div>
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
                    {instruction.ingredients.flatMap((link) => {
                      const recipeIngredient =
                        effectiveRecipeIngredientById.get(
                          link.recipeIngredient.id,
                        ) ?? link.recipeIngredient;

                      return badgeMemberIds.flatMap((memberId) => {
                        if (
                          !isInstructionIngredientVisibleForPerson(
                            recipeIngredient,
                            memberId,
                          )
                        ) {
                          return [];
                        }

                        const selectedUnitId =
                          selectedUnits[recipeIngredient.id] ||
                          recipeIngredient.unit?.id ||
                          null;
                        const hasAmount = recipeIngredient.amount != null;
                        const manualScale =
                          getIngredientDisplayScalingFactor(
                            recipeIngredient.id,
                          ) * getIngredientCalorieFactor(recipeIngredient);
                        const badgeAmount = hasAmount
                          ? getInstructionIngredientBadgeAmount({
                              amount: recipeIngredient.amount,
                              memberAdjustments:
                                recipeIngredient.memberAdjustments,
                              audienceMemberIds,
                              selectedFamilyMemberId: memberId,
                              familyMembers,
                              memberPortions,
                              cookingFamilyMemberIds,
                              recipeServings,
                              rowScaleFactor: manualScale * mealCount,
                            })
                          : null;

                        if (hasAmount && badgeAmount == null) {
                          return [];
                        }

                        const display = hasAmount
                          ? getIngredientDisplay(
                              badgeAmount,
                              recipeIngredient.unit?.id ?? null,
                              recipeIngredient.unit?.name ?? null,
                              selectedUnitId,
                              recipeIngredient.ingredient.unitConversions,
                              1,
                              1,
                            )
                          : {
                              displayAmount: null,
                              rawAmount: null,
                              displayUnitName: "",
                              displayUnitNamePlural: null,
                            };
                        const badgeParts = getInstructionIngredientBadgeParts({
                          rawAmount: display.rawAmount,
                          displayAmount: display.displayAmount,
                          displayUnitName: display.displayUnitName,
                          displayUnitNamePlural: display.displayUnitNamePlural,
                          ingredientName: recipeIngredient.ingredient.name,
                          additionalInfo: recipeIngredient.additionalInfo,
                        });

                        const member = familyMembers.find(
                          (entry) => entry.id === memberId,
                        );
                        const memberLabel =
                          member?.name.trim() ||
                          (member?.isSelf ? "You" : "Person");

                        return (
                          <Badge
                            key={`${instruction.id}-${recipeIngredient.id}-${memberId}`}
                            variant="secondary"
                            className={
                              isSelected
                                ? "bg-background border-foreground/20"
                                : undefined
                            }
                          >
                            <span>{badgeParts.ingredientName}</span>
                            {getInstructionIngredientBadgeTailSegments(
                              badgeParts,
                            ).map((segment, segmentIndex) => (
                              <span
                                key={`${segment}-${segmentIndex}`}
                                className="opacity-75"
                              >
                                {` · ${segment}`}
                              </span>
                            ))}
                            {selectedInstructionFamilyMemberId == null &&
                            familyMembers.length > 1 ? (
                              <span className="opacity-75">{` · ${memberLabel}`}</span>
                            ) : null}
                          </Badge>
                        );
                      });
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
