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
  rowScaleFactor: number;
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
    rowScaleFactor,
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

      const badgeAmount = getInstructionIngredientBadgeAmount({
        amount: recipeIngredient.amount,
        memberAdjustments: recipeIngredient.memberAdjustments,
        audienceMemberIds,
        selectedFamilyMemberId: memberId,
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings,
        rowScaleFactor,
      });

      if (badgeAmount == null) {
        continue;
      }

      shares.push({ familyMemberId: memberId, amount: badgeAmount });
    }

    return shares;
  }, [
    audienceMemberIds,
    cookingFamilyMemberIds,
    familyMembers,
    hasAmount,
    memberPortions,
    recipeIngredient,
    recipeServings,
    rowScaleFactor,
  ]);

  const isVisibleToAnyone = cookingFamilyMemberIds.some((memberId) =>
    isInstructionIngredientVisibleForPerson(recipeIngredient, memberId),
  );

  if (!isVisibleToAnyone) {
    return null;
  }

  if (!hasAmount) {
    return (
      <InstructionIngredientCard
        badgeInput={{
          rawAmount: null,
          displayAmount: null,
          displayUnitName: "",
          displayUnitNamePlural: null,
          ingredientName: recipeIngredient.ingredient.name,
          additionalInfo: recipeIngredient.additionalInfo,
        }}
        familyMembers={familyMembers}
        selectedUnitId={selectedUnitId}
        baseUnitId={recipeIngredient.unit?.id ?? null}
        baseUnitName={recipeIngredient.unit?.name ?? null}
        unitConversions={unitConversions}
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
    mealCount,
    cookingFamilyMemberIds,
    effectiveRecipeIngredientById,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageInstructionsSectionData();
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);

  const showMemberBreakdown = cookingFamilyMemberIds.length > 1;

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
                  <div className="flex flex-wrap gap-x-item gap-y-tight">
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
                          rowScaleFactor={manualScale * mealCount}
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
