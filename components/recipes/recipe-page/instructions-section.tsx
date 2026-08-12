"use client";

import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import { useMemo, useState } from "react";
import {
  getIngredientDisplay,
  getInstructionIngredientBadgeAmount,
  isInstructionIngredientVisibleForPerson,
  type UnitConversionWithName,
} from "@/lib/recipes/helpers";
import { useRecipePageInstructionsSectionData } from "@/components/context/recipe-page-context";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import {
  InstructionIngredientCard,
  type InstructionIngredientMemberShare,
} from "@/components/recipes/recipe-page/instruction-ingredient-card";
import { COOK_SESSION_EXTRAS_SHARE_ID } from "@/lib/recipes/shared-portion-shares";
import type { RecipeType } from "@/types/recipe";

type RecipeIngredient = RecipeType["ingredients"][number];

function InstructionStepIngredientCard(props: {
  recipeIngredient: RecipeIngredient;
  cookingFamilyMemberIds: string[];
  familyMembers: ReturnType<
    typeof useRecipePageInstructionsSectionData
  >["familyMembers"];
  audienceMemberIds: string[];
  memberPortions: ReturnType<
    typeof useRecipePageInstructionsSectionData
  >["memberPortions"];
  recipeServings: number;
  selectedUnitId: string | null;
  /** Manual/calorie scale only — meal counts applied per person below. */
  manualScale: number;
  /** Per-person meal counts for this cook session (defaults to 1 each). */
  personMealCounts: Map<string, number>;
  /** Anonymous extra portions from Meals (1× base shares). */
  extraPortions: number;
  showMemberBreakdown: boolean;
  badgeClassName?: string;
}) {
  const {
    recipeIngredient,
    cookingFamilyMemberIds,
    familyMembers,
    audienceMemberIds,
    memberPortions,
    recipeServings,
    selectedUnitId,
    manualScale,
    personMealCounts,
    extraPortions,
    showMemberBreakdown,
    badgeClassName,
  } = props;

  const unitConversions =
    recipeIngredient.ingredient.unitConversions as UnitConversionWithName[];
  const hasAmount = recipeIngredient.amount != null;

  const memberShares = useMemo(() => {
    const shares: InstructionIngredientMemberShare[] = [];

    for (const memberId of cookingFamilyMemberIds) {
      if (
        !isInstructionIngredientVisibleForPerson(recipeIngredient, memberId)
      ) {
        continue;
      }

      if (!hasAmount) {
        continue;
      }

      const memberMealCount = personMealCounts.get(memberId) ?? 0;
      if (memberMealCount <= 0) {
        continue;
      }

      const badgeAmount = getInstructionIngredientBadgeAmount({
        amount: recipeIngredient.amount,
        memberAdjustments: recipeIngredient.memberAdjustments,
        audienceMemberIds,
        selectedFamilyMemberId: memberId,
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings,
        rowScaleFactor: manualScale * memberMealCount,
      });

      if (badgeAmount == null) {
        continue;
      }

      shares.push({ familyMemberId: memberId, amount: badgeAmount });
    }

    // Same formula as resolveCookingAggregatedLines: (batch ÷ servings) × extras × scale.
    if (
      extraPortions > 0 &&
      hasAmount &&
      recipeServings > 0 &&
      recipeIngredient.amount != null
    ) {
      const extraAmount =
        Math.round(
          ((recipeIngredient.amount / recipeServings) *
            extraPortions *
            manualScale *
            1000),
        ) / 1000;
      if (extraAmount > 0) {
        shares.push({
          familyMemberId: COOK_SESSION_EXTRAS_SHARE_ID,
          amount: extraAmount,
        });
      }
    }

    return shares;
  }, [
    audienceMemberIds,
    cookingFamilyMemberIds,
    extraPortions,
    familyMembers,
    hasAmount,
    manualScale,
    memberPortions,
    personMealCounts,
    recipeIngredient,
    recipeServings,
  ]);

  const isVisibleToAnyone = cookingFamilyMemberIds.some((memberId) =>
    isInstructionIngredientVisibleForPerson(recipeIngredient, memberId),
  );
  const hasExtrasShare = memberShares.some(
    (share) => share.familyMemberId === COOK_SESSION_EXTRAS_SHARE_ID,
  );

  if (!isVisibleToAnyone && !hasExtrasShare) {
    return null;
  }

  if (!hasAmount) {
    // Match Ingredients: name (+ optional unit like "to taste"), no people breakdown.
    return (
      <InstructionIngredientCard
        badgeInput={{
          rawAmount: null,
          displayAmount: null,
          displayUnitName: recipeIngredient.unit?.name ?? "",
          displayUnitNamePlural: recipeIngredient.unit?.namePlural ?? null,
          ingredientName: recipeIngredient.ingredient.name,
          additionalInfo: recipeIngredient.additionalInfo,
        }}
        familyMembers={familyMembers}
        selectedUnitId={selectedUnitId}
        baseUnitId={recipeIngredient.unit?.id ?? null}
        baseUnitName={recipeIngredient.unit?.name ?? null}
        unitConversions={unitConversions}
        showMemberBreakdown={false}
        className={badgeClassName}
      />
    );
  }

  const aggregatedRawAmount = memberShares.reduce(
    (total, share) => total + share.amount,
    0,
  );

  if (aggregatedRawAmount <= 0) {
    return null;
  }

  const display = getIngredientDisplay(
    aggregatedRawAmount,
    recipeIngredient.unit?.id ?? null,
    recipeIngredient.unit?.name ?? null,
    selectedUnitId,
    unitConversions,
    1,
    1,
  );

  return (
    <InstructionIngredientCard
      badgeInput={{
        rawAmount: display.rawAmount,
        displayAmount: display.displayAmount,
        displayUnitName: display.displayUnitName,
        displayUnitNamePlural: display.displayUnitNamePlural,
        ingredientName: recipeIngredient.ingredient.name,
        additionalInfo: recipeIngredient.additionalInfo,
      }}
      memberShares={memberShares}
      familyMembers={familyMembers}
      selectedUnitId={selectedUnitId}
      baseUnitId={recipeIngredient.unit?.id ?? null}
      baseUnitName={recipeIngredient.unit?.name ?? null}
      unitConversions={unitConversions}
      showMemberBreakdown={showMemberBreakdown}
      className={badgeClassName}
    />
  );
}

export function InstructionsSection() {
  const {
    instructions,
    familyMembers,
    recipeServings,
    audienceMemberIds,
    memberPortions,
    personMealCounts,
    cookingFamilyMemberIds,
    extraPortions,
    effectiveRecipeIngredientById,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageInstructionsSectionData();
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);

  // Breakdown when 2+ people cook, or extras need their own “E” row.
  const showMemberBreakdown =
    cookingFamilyMemberIds.length > 1 || extraPortions > 0;

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
      <div className="mb-item">
        <Subheader>Instructions</Subheader>
      </div>
      <ol className="flex flex-col gap-item">
        {instructions.map((instruction, index) => {
          const isSelected = selectedInstructionId === instruction.id;
          const badgeClassName = isSelected
            ? "border-foreground/20 bg-background"
            : "group-hover:border-foreground/20 group-hover:bg-background";

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

                {instruction.ingredients.length > 0 ? (
                  <div className="flex flex-wrap items-start gap-x-item gap-y-tight">
                    {instruction.ingredients.map((link) => {
                      const recipeIngredient =
                        effectiveRecipeIngredientById.get(
                          link.recipeIngredient.id,
                        ) ?? { ...link.recipeIngredient, group: null };
                      const selectedUnitId =
                        selectedUnits[recipeIngredient.id] ||
                        recipeIngredient.unit?.id ||
                        null;
                      const manualScale =
                        getIngredientDisplayScalingFactor(
                          recipeIngredient.id,
                        ) * getIngredientCalorieFactor(recipeIngredient);

                      return (
                        <InstructionStepIngredientCard
                          key={`${instruction.id}-${recipeIngredient.id}`}
                          recipeIngredient={recipeIngredient}
                          cookingFamilyMemberIds={cookingFamilyMemberIds}
                          familyMembers={familyMembers}
                          audienceMemberIds={audienceMemberIds}
                          memberPortions={memberPortions}
                          recipeServings={recipeServings}
                          selectedUnitId={selectedUnitId}
                          manualScale={manualScale}
                          personMealCounts={personMealCounts}
                          extraPortions={extraPortions}
                          showMemberBreakdown={showMemberBreakdown}
                          badgeClassName={badgeClassName}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
