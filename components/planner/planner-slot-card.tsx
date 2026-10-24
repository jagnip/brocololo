"use client";

import { useState, type MouseEvent } from "react";
import type { SlotInputType } from "@/types/planner";
import type { PlanSlotMealPayload } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Shuffle, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { PlanSlotMealDialog } from "./plan-slot-meal-dialog";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import {
  getAddMealDialogCopy,
  getEditMealDialogCopy,
} from "@/lib/planner/plan-slot-meal-dialog-copy";
import { formatShortDayLabel } from "@/lib/planner/helpers";
import { ROUTES } from "@/lib/constants";
import { PLANNER_MEAL_TYPE_TO_OCCASION_SLUG } from "@/lib/planner/recipe-picker-filters";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { Checkbox } from "@/components/ui/checkbox";
import { getSegmentedFilterSurfaceClassName } from "@/components/ui/segmented-filter-button";

/** Soft selected icon color on accent shell (not white-on-primary). */
const MEAL_DONE_ICON_CLASS =
  "text-accent-foreground hover:text-accent-foreground [&_svg]:text-accent-foreground";

type PlannerSlotCardProps = {
  slot: SlotInputType;
  isSelected?: boolean;
  onSelectionChange?: (checked: boolean) => void;
  onCardSelect?: (modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
  fridgeMatchIngredients?: string[];
  onShuffle?: () => void;
  onSetMeal?: (payload: PlanSlotMealPayload) => void;
  onRemove?: () => void;
  onToggleUsed?: () => void;
  familyMembers?: FamilyMemberRow[];
  onAudienceChange?: (memberIds: string[]) => void;
  /** Live "N of M" label for batch-recipe groups with 2+ members. */
  batchLabel?: { index: number; total: number; storageCount?: number };
  onEditBatch?: () => void;
  /** Prefills Cooking on the recipe page from this plan slot / batch group. */
  recipeCookingHref?: string;
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
};

export function PlannerSlotCard({
  slot,
  isSelected = false,
  onSelectionChange,
  onCardSelect,
  fridgeMatchIngredients,
  onShuffle,
  onSetMeal,
  onRemove,
  onToggleUsed,
  familyMembers = [],
  batchLabel,
  onEditBatch,
  recipeCookingHref,
  recipes,
  ingredientOptions,
}: PlannerSlotCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { recipe, customMeal } = slot;

  const mealLabel =
    slot.mealType === "BREAKFAST"
      ? "Breakfast"
      : slot.mealType === "LUNCH"
        ? "Lunch"
        : "Dinner";

  const dialogSlotSubtitle = `${formatShortDayLabel(slot.date)} · ${mealLabel}`;
  const currentMealName = recipe?.name ?? customMeal?.name ?? null;
  const addMealDialogCopy = getAddMealDialogCopy(dialogSlotSubtitle);
  const editMealDialogCopy = getEditMealDialogCopy(
    currentMealName
      ? `${dialogSlotSubtitle} · ${currentMealName}`
      : dialogSlotSubtitle,
  );
  const canEdit = Boolean(onSetMeal);
  const isEmpty = !recipe && !customMeal;
  const selectedAudienceIds =
    slot.cookingFamilyMemberIds && slot.cookingFamilyMemberIds.length > 0
      ? slot.cookingFamilyMemberIds
      : familyMembers.map((member) => member.id);
  const hasSelectionControls = Boolean(onSelectionChange);
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!onCardSelect || !(event.target instanceof Element)) return;
    if (event.target.closest("a, button, input, select, textarea, [role='checkbox']")) return;
    event.preventDefault();
    onCardSelect({
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
    });
  };
  const initialOccasionSlug =
    PLANNER_MEAL_TYPE_TO_OCCASION_SLUG[slot.mealType] ?? null;

  const mealDialogAudienceProps = {
    cookingFamilyMemberIds: selectedAudienceIds,
    familyMembers,
    initialExtraPortions: slot.extraPortions,
  };

  const audienceNames = familyMembers
    .filter((member) => selectedAudienceIds.includes(member.id))
    .map((member) => member.name)
    .join(" \u00b7 ");
  const audienceText = [
    audienceNames,
    recipe && (slot.extraPortions ?? 0) > 0
      ? `${slot.extraPortions} extra portion${slot.extraPortions === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean).join(" \u00b7 ");
  const audience = (
    <p className="type-body mt-1 line-clamp-2 break-words" aria-label="Cooking for" title={audienceText}>
      {audienceText}
    </p>
  );
  const metadataRail = (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 bg-muted px-card-x text-xs text-muted-foreground">
      <span>{recipe && slot.alreadyCooked ? "Already cooked" : slot.isRolledOver ? "Rolled over" : "New"}</span>
      {recipe ? (
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {slot.alreadyCooked ? 10 : recipe.handsOnTime} min
        </Badge>
      ) : null}
    </div>
  );

  const renderSlotActions = (options: {
    canShuffle: boolean;
    showChange: boolean;
  }) => {
    const hasActions =
      options.canShuffle ||
      options.showChange ||
      onRemove ||
      onToggleUsed;
    if (!hasActions) {
      return null;
    }

    return (
      <div className="mt-item flex w-full items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {onToggleUsed && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                getSegmentedFilterSurfaceClassName(slot.used),
                slot.used && MEAL_DONE_ICON_CLASS,
              )}
              onClick={onToggleUsed}
            >
              <Check
                className="h-4 w-4"
                strokeWidth={slot.used ? 2.5 : 2}
              />
            </Button>
          )}
          {options.canShuffle && onShuffle && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onShuffle}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
          )}
          {options.showChange && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openDialog}
              aria-label="Edit meal"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
          {onRemove && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRemove}
              aria-label="Remove meal"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
      </div>
    );
  };

  const renderSelectionCheckbox = (
    label: string,
    { elevated = false }: { elevated?: boolean } = {},
  ) =>
    hasSelectionControls ? (
      <div
        className="absolute left-3 top-3 z-2"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Flat on empty slots; shadow only where the checkbox sits over imagery. */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange?.(checked === true)}
          aria-label={label}
          className={cn(
            "size-6 rounded-[6px] bg-card",
            "hover:bg-card",
            // Keep default soft checked tokens (accent) — no full-primary override.
            "[&_[data-slot=checkbox-indicator]_svg]:size-4",
            elevated
              ? "border-foreground/30 shadow-md data-[state=checked]:shadow-md"
              : "border-border shadow-none data-[state=checked]:shadow-none",
          )}
        />
      </div>
    ) : null;

  const openDialog = () => {
    if (!canEdit) return;
    setIsDialogOpen(true);
  };

  const handleSaveMeal = async (payload: PlanSlotMealPayload) => {
    if (!onSetMeal) return;
    await onSetMeal(payload);
    setIsDialogOpen(false);
  };

  if (isEmpty) {
    return (
      <>
        <div
          className={cn(
            "relative flex h-88 min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-dashed border-border bg-card p-0 py-0 shadow-none transition-colors",
            isSelected && "border-2 border-primary",
          )}
          data-planner-selection-card=""
          onClick={handleCardClick}
        >
          {renderSelectionCheckbox(`Select ${mealLabel} slot`)}
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="flex min-h-0 h-full flex-1 flex-col items-center justify-center gap-2 rounded-none p-3 text-center shadow-none hover:bg-muted/40"
              onClick={openDialog}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                aria-hidden
              >
                <span className="text-base leading-none">+</span>
              </span>
              <p className="text-sm font-medium leading-snug text-foreground">
                {mealLabel}
              </p>
              <span className="text-xs text-muted-foreground">Add meal</span>
            </Button>
          ) : null}
        </div>

        {canEdit ? (
          <PlanSlotMealDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            title={addMealDialogCopy.title}
            subtitle={addMealDialogCopy.subtitle}
            saveLabel={addMealDialogCopy.saveLabel}
            recipes={recipes}
            ingredientOptions={ingredientOptions}
            initialRecipeId={null}
            initialCustomName=""
            initialRows={[]}
            defaultTab="repository"
            initialOccasionSlug={initialOccasionSlug}
            {...mealDialogAudienceProps}
            isSaving={false}
            onCancel={() => setIsDialogOpen(false)}
            onSave={handleSaveMeal}
          />
        ) : null}
      </>
    );
  }

  if (customMeal) {
    return (
      <>
        <Card
          className={cn(
            "card-interactive relative h-88 gap-0 overflow-hidden border-border py-0",
            slot.used && "opacity-50",
            isSelected && "border-2 border-primary",
          )}
          data-planner-selection-card=""
          onClick={handleCardClick}
        >
          {renderSelectionCheckbox(`Select ${customMeal.name} (${mealLabel})`, {
            elevated: true,
          })}
          <div className="relative h-44 w-full shrink-0 overflow-hidden">
            <RecipeImagePlaceholder showLabel={false} iconSize="lg" />
          </div>
          {metadataRail}
          <CardHeader className="flex min-h-0 flex-1 flex-col gap-0 px-card-x py-card-y">
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <div>
                <h3 className="truncate type-h3" title={customMeal.name}>
                  {customMeal.name}
                </h3>
                {audience}
              </div>
              <div className="mt-auto">{renderSlotActions({ canShuffle: false, showChange: canEdit })}</div>
            </div>
          </CardHeader>
        </Card>

        {canEdit ? (
          <PlanSlotMealDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            title={editMealDialogCopy.title}
            subtitle={editMealDialogCopy.subtitle}
            saveLabel={editMealDialogCopy.saveLabel}
            recipes={recipes}
            ingredientOptions={ingredientOptions}
            initialRecipeId={null}
            initialCustomName={customMeal.name}
            initialRows={customMeal.ingredients.map((row) => ({
              ingredientId: row.ingredientId,
              unitId: row.unitId,
              amount: row.amount,
            }))}
            defaultTab="custom"
            initialOccasionSlug={initialOccasionSlug}
            {...mealDialogAudienceProps}
            isSaving={false}
            onCancel={() => setIsDialogOpen(false)}
            onSave={handleSaveMeal}
          />
        ) : null}
      </>
    );
  }

  const imageUrl = getRecipeDisplayImageUrl(recipe!.images);
  const canShuffle = onShuffle && slot.alternatives.length > 0;

  return (
    <>
      <Card
        className={cn(
          "card-interactive relative h-88 gap-0 overflow-hidden border-border py-0",
          slot.used && "opacity-50",
          isSelected && "border-2 border-primary",
        )}
        data-planner-selection-card=""
        onClick={handleCardClick}
      >
        {renderSelectionCheckbox(`Select ${recipe!.name} (${mealLabel})`, {
          elevated: true,
        })}
        <div className="relative h-44 w-full shrink-0 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={recipe!.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <RecipeImagePlaceholder />
          )}
          {/* Chronological position within this batch, including stored meals in the total. */}
          {recipe!.isBatchRecipe && batchLabel ? (
            onEditBatch ? (
              <Badge asChild variant="default">
                <button
                  type="button"
                  className="absolute right-3 top-3 z-2 shadow-md hover:bg-border"
                  aria-label={`Batch meal ${batchLabel.index} of ${batchLabel.total}${batchLabel.storageCount ? `, ${batchLabel.storageCount} in storage` : ""}`}
                  title="Edit batch"
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditBatch();
                  }}
                >
                  <span>
                    <span>{`${batchLabel.index} of ${batchLabel.total}`}</span>
                    {batchLabel.storageCount ? (
                      <span className="font-normal opacity-75">{` · ${batchLabel.storageCount} in storage`}</span>
                    ) : null}
                  </span>
                </button>
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="absolute right-3 top-3 z-2 shadow-md"
                aria-label={`Batch meal ${batchLabel.index} of ${batchLabel.total}${batchLabel.storageCount ? `, ${batchLabel.storageCount} in storage` : ""}`}
              >
                <span>
                  <span>{`${batchLabel.index} of ${batchLabel.total}`}</span>
                  {batchLabel.storageCount ? (
                    <span className="font-normal opacity-75">{` · ${batchLabel.storageCount} in storage`}</span>
                  ) : null}
                </span>
              </Badge>
            )
          ) : null}
        </div>
        {metadataRail}
        <CardHeader className="flex min-h-0 flex-1 flex-col gap-0 px-card-x py-card-y">
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={recipeCookingHref ?? ROUTES.recipe(recipe!.slug)}
                  className="block min-w-0 truncate type-h3 hover:underline underline-offset-2"
                  title={recipe!.name}
                  onClick={(event) => event.stopPropagation()}
                >
                  {recipe!.name}
                </Link>
                {audience}
              </div>
            </div>
            <div className="mt-item flex min-h-0 flex-wrap items-start gap-2 overflow-auto">
              {fridgeMatchIngredients &&
                fridgeMatchIngredients.length > 0 &&
                fridgeMatchIngredients.map((name) => (
                  <Badge key={name} variant="produce" className="text-xs">
                    {name}
                  </Badge>
                ))}
            </div>
            <div className="mt-auto">{renderSlotActions({
              canShuffle: Boolean(canShuffle),
              showChange: canEdit,
            })}</div>
          </div>
        </CardHeader>
      </Card>

      {canEdit ? (
        <PlanSlotMealDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editMealDialogCopy.title}
          subtitle={editMealDialogCopy.subtitle}
          saveLabel={editMealDialogCopy.saveLabel}
          recipes={recipes}
          ingredientOptions={ingredientOptions}
          initialRecipeId={recipe!.id}
          initialCustomName=""
          // Custom-tab draft starts empty; recipe ingredients are resolved live
          // in the right column from the selected recipe + eaters.
          initialRows={[]}
          defaultTab="repository"
          initialOccasionSlug={initialOccasionSlug}
          batchLabel={batchLabel}
          {...mealDialogAudienceProps}
          isSaving={false}
          onCancel={() => setIsDialogOpen(false)}
          onSave={handleSaveMeal}
        />
      ) : null}
    </>
  );
}
