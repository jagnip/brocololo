"use client";

import { useMemo, useState } from "react";
import type { SlotInputType } from "@/types/planner";
import type { PlanSlotMealPayload } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Shuffle, X, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { PlanSlotMealDialog } from "./plan-slot-meal-dialog";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import { getAddMealDialogCopy, getReplaceMealDialogCopy } from "@/lib/planner/plan-slot-meal-dialog-copy";
import { formatDayLabel } from "@/lib/planner/helpers";
import {
  getPlannerRecipeDialogIngredientRows,
  getPlannerSlotIngredientSummary,
} from "@/lib/planner/resolve-slot-ingredients";
import { ROUTES } from "@/lib/constants";
import { SlotAudienceSelect } from "./slot-audience-select";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { Checkbox } from "@/components/ui/checkbox";
import { getSegmentedFilterSurfaceClassName } from "@/components/ui/segmented-filter-button";

/** Soft selected icon color on accent shell (not white-on-primary). */
const MEAL_DONE_ICON_CLASS =
  "text-accent-foreground hover:text-accent-foreground [&_svg]:text-accent-foreground";

function SlotIngredientSummary({
  visibleLines,
  remainingCount,
}: {
  visibleLines: string[];
  remainingCount: number;
}) {
  if (visibleLines.length === 0) {
    return null;
  }

  return (
    <ul className="mt-item space-y-0.5 text-xs text-muted-foreground">
      {visibleLines.map((line) => (
        <li key={line} className="truncate" title={line}>
          {line}
        </li>
      ))}
      {remainingCount > 0 ? (
        <li className="text-muted-foreground/80">and {remainingCount} more</li>
      ) : null}
    </ul>
  );
}

type PlannerSlotCardProps = {
  slot: SlotInputType;
  isSelected?: boolean;
  onSelectionChange?: (checked: boolean) => void;
  onShiftSelect?: () => void;
  fridgeMatchIngredients?: string[];
  onShuffle?: () => void;
  onSetMeal?: (payload: PlanSlotMealPayload) => void;
  onRemove?: () => void;
  onToggleUsed?: () => void;
  familyMembers?: FamilyMemberRow[];
  onAudienceChange?: (memberIds: string[]) => void;
  /** Live "N of M" label for batch-recipe groups with 2+ members. */
  batchLabel?: { index: number; total: number };
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
};

export function PlannerSlotCard({
  slot,
  isSelected = false,
  onSelectionChange,
  onShiftSelect,
  fridgeMatchIngredients,
  onShuffle,
  onSetMeal,
  onRemove,
  onToggleUsed,
  familyMembers = [],
  onAudienceChange,
  batchLabel,
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

  const dialogSlotSubtitle = `${mealLabel} · ${formatDayLabel(slot.date)}`;
  const addMealDialogCopy = getAddMealDialogCopy(dialogSlotSubtitle);
  const replaceMealDialogCopy = getReplaceMealDialogCopy(1);
  const canEdit = Boolean(onSetMeal);
  const isEmpty = !recipe && !customMeal;
  const selectedAudienceIds =
    slot.cookingFamilyMemberIds && slot.cookingFamilyMemberIds.length > 0
      ? slot.cookingFamilyMemberIds
      : familyMembers.map((member) => member.id);
  const showAudienceSelect =
    familyMembers.length > 0 && Boolean(onAudienceChange);
  const hasSelectionControls = Boolean(onSelectionChange);

  const ingredientSummary = useMemo(
    () =>
      getPlannerSlotIngredientSummary({
        recipe: recipe ?? null,
        customMealIngredients: customMeal?.ingredients,
        cookingFamilyMemberIds: selectedAudienceIds,
        familyMembers,
        ingredientOptions,
      }),
    [
      customMeal?.ingredients,
      familyMembers,
      ingredientOptions,
      recipe,
      selectedAudienceIds,
    ],
  );

  const recipeDialogInitialRows = useMemo(() => {
    if (!recipe) {
      return [];
    }
    return getPlannerRecipeDialogIngredientRows({
      recipe,
      cookingFamilyMemberIds: selectedAudienceIds,
      familyMembers,
    });
  }, [familyMembers, recipe, selectedAudienceIds]);

  const mealDialogAudienceProps = {
    cookingFamilyMemberIds: selectedAudienceIds,
    familyMembers,
  };

  const renderAudienceSelect = () =>
    showAudienceSelect ? (
      <SlotAudienceSelect
        familyMembers={familyMembers}
        value={selectedAudienceIds}
        onChange={(memberIds) => onAudienceChange?.(memberIds)}
      />
    ) : null;

  const renderSlotActions = (options: {
    canShuffle: boolean;
    showChange: boolean;
  }) => {
    const hasActions =
      options.canShuffle ||
      options.showChange ||
      onRemove ||
      onToggleUsed ||
      showAudienceSelect;
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
              aria-label="Change meal"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {renderAudienceSelect()}
      </div>
    );
  };

  const shouldIgnoreCardClick = (target: HTMLElement) =>
    Boolean(
      target.closest("button") ||
        target.closest("[data-slot='checkbox']") ||
        target.closest("a") ||
        target.closest("[data-slot='popover-content']"),
    );

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
            "relative flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-dashed border-border bg-card p-0 py-0 shadow-none transition-colors",
            isSelected && "border-2 border-primary",
          )}
          onClick={(event) => {
            if (!event.shiftKey) return;
            event.preventDefault();
            onShiftSelect?.();
          }}
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
            "card-interactive relative h-full gap-0 overflow-hidden border-border py-0",
            slot.used && "opacity-50",
            canEdit && "cursor-pointer",
            isSelected && "border-2 border-primary",
          )}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (shouldIgnoreCardClick(target)) return;
            if (event.shiftKey) {
              event.preventDefault();
              onShiftSelect?.();
              return;
            }
            openDialog();
          }}
        >
          {renderSelectionCheckbox(`Select ${customMeal.name} (${mealLabel})`, {
            elevated: true,
          })}
          <div className="relative w-full overflow-hidden aspect-2/1 sm:aspect-3/2">
            <RecipeImagePlaceholder showLabel={false} iconSize="lg" />
          </div>
          <CardHeader className="px-card-x py-card-y">
            <div className="min-w-0">
              <div>
                <h3 className="truncate type-h3" title={customMeal.name}>
                  {customMeal.name}
                </h3>
                <p className="type-body mt-0.5 text-sm text-muted-foreground">
                  {mealLabel}
                </p>
              </div>
              <SlotIngredientSummary
                visibleLines={ingredientSummary.visibleLines}
                remainingCount={ingredientSummary.remainingCount}
              />
              {renderSlotActions({ canShuffle: false, showChange: canEdit })}
            </div>
          </CardHeader>
        </Card>

        {canEdit ? (
          <PlanSlotMealDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            title={replaceMealDialogCopy.title}
            subtitle={replaceMealDialogCopy.subtitle}
            saveLabel={replaceMealDialogCopy.saveLabel}
            recipes={recipes}
            ingredientOptions={ingredientOptions}
            initialRecipeId={null}
            initialCustomName={customMeal.name}
            initialRows={customMeal.ingredients.map((row) => ({
              ingredientId: row.ingredientId,
              unitId: row.unitId,
              amount: row.amount,
            }))}
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
          "card-interactive relative h-full gap-0 overflow-hidden border-border py-0",
          slot.used && "opacity-50",
          canEdit && "cursor-pointer",
          isSelected && "border-2 border-primary",
        )}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (shouldIgnoreCardClick(target)) return;
          if (event.shiftKey) {
            event.preventDefault();
            onShiftSelect?.();
            return;
          }
          openDialog();
        }}
      >
        {renderSelectionCheckbox(`Select ${recipe!.name} (${mealLabel})`, {
          elevated: true,
        })}
        <div className="relative w-full overflow-hidden aspect-2/1 sm:aspect-3/2">
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
          {/* Batch badge only when recipe is marked batch AND live group has 2+ slots. */}
          {recipe!.isBatchRecipe && batchLabel ? (
            <Badge
              variant="default"
              className="absolute right-3 top-3 z-2 shadow-md"
              aria-label={`Meal ${batchLabel.index} of ${batchLabel.total}`}
            >
              {batchLabel.index} of {batchLabel.total}
            </Badge>
          ) : null}
        </div>
        <CardHeader className="px-card-x py-card-y">
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={ROUTES.recipe(recipe!.slug)}
                  className="block min-w-0 truncate type-h3 hover:underline underline-offset-2"
                  title={recipe!.name}
                  onClick={(event) => event.stopPropagation()}
                >
                  {recipe!.name}
                </Link>
                <p className="type-body mt-0.5 text-sm text-muted-foreground">
                  {mealLabel}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {recipe!.handsOnTime} min
              </Badge>
            </div>
            <div className="mt-item flex flex-wrap items-start gap-2">
              {fridgeMatchIngredients &&
                fridgeMatchIngredients.length > 0 &&
                fridgeMatchIngredients.map((name) => (
                  <Badge key={name} variant="produce" className="text-xs">
                    {name}
                  </Badge>
                ))}
            </div>
            <SlotIngredientSummary
              visibleLines={ingredientSummary.visibleLines}
              remainingCount={ingredientSummary.remainingCount}
            />
            {renderSlotActions({
              canShuffle: Boolean(canShuffle),
              showChange: canEdit,
            })}
          </div>
        </CardHeader>
      </Card>

      {canEdit ? (
        <PlanSlotMealDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={replaceMealDialogCopy.title}
          subtitle={replaceMealDialogCopy.subtitle}
          saveLabel={replaceMealDialogCopy.saveLabel}
          recipes={recipes}
          ingredientOptions={ingredientOptions}
          initialRecipeId={recipe!.id}
          initialCustomName=""
          initialRows={recipeDialogInitialRows}
          {...mealDialogAudienceProps}
          isSaving={false}
          onCancel={() => setIsDialogOpen(false)}
          onSave={handleSaveMeal}
        />
      ) : null}
    </>
  );
}
