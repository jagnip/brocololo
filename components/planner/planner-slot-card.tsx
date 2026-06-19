"use client";

import { useState } from "react";
import type { SlotInputType } from "@/types/planner";
import type { PlanSlotMealPayload } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Check,
  PackageCheck,
  ShoppingCart,
  Shuffle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { PlanSlotMealDialog } from "./plan-slot-meal-dialog";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import { formatDayLabel } from "@/lib/planner/helpers";

type PlannerSlotCardProps = {
  slot: SlotInputType;
  fridgeMatchIngredients?: string[];
  onShuffle?: () => void;
  onSetMeal?: (payload: PlanSlotMealPayload) => void;
  onRemove?: () => void;
  onToggleUsed?: () => void;
  onToggleExcludeFromGroceries?: () => void;
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
};

function hasGroceryRelevantContent(slot: SlotInputType): boolean {
  if (slot.recipe) return true;
  return (slot.customMeal?.ingredients.length ?? 0) > 0;
}

function SlotGroceryToggle({
  excluded,
  onToggle,
}: {
  excluded: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant={excluded ? "default" : "outline"}
      size="icon"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-label={
        excluded
          ? "Already stocked — skip groceries"
          : "Include in grocery list"
      }
      title={
        excluded
          ? "Already stocked — skip groceries"
          : "Include in grocery list"
      }
    >
      {excluded ? (
        <PackageCheck className="h-4 w-4" strokeWidth={2} />
      ) : (
        <ShoppingCart className="h-4 w-4" strokeWidth={2} />
      )}
    </Button>
  );
}

type SlotActionRowProps = {
  slot: SlotInputType;
  canShuffle: boolean;
  canEdit: boolean;
  onEdit?: () => void;
  onShuffle?: () => void;
  onRemove?: () => void;
  onToggleUsed?: () => void;
  onToggleExcludeFromGroceries?: () => void;
};

function SlotActionRow({
  slot,
  canShuffle,
  canEdit,
  onEdit,
  onShuffle,
  onRemove,
  onToggleUsed,
  onToggleExcludeFromGroceries,
}: SlotActionRowProps) {
  const showGroceryToggle =
    Boolean(onToggleExcludeFromGroceries) && hasGroceryRelevantContent(slot);
  const showLeftActions =
    canShuffle || canEdit || Boolean(onRemove) || Boolean(onToggleUsed);

  if (!showLeftActions && !showGroceryToggle) {
    return null;
  }

  return (
    <div className="mt-item flex w-full items-center justify-between gap-1">
      <div className="flex gap-1">
        {onToggleUsed ? (
          <Button
            type="button"
            variant={slot.used ? "default" : "outline"}
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onToggleUsed();
            }}
          >
            <Check className="h-4 w-4" strokeWidth={2} />
          </Button>
        ) : null}
        {canShuffle && onShuffle ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onShuffle();
            }}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        ) : null}
        {canEdit && onEdit ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            aria-label="Change meal"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        ) : null}
        {onRemove ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {showGroceryToggle && onToggleExcludeFromGroceries ? (
        <SlotGroceryToggle
          excluded={slot.excludeFromGroceries}
          onToggle={onToggleExcludeFromGroceries}
        />
      ) : null}
    </div>
  );
}

export function PlannerSlotCard({
  slot,
  fridgeMatchIngredients,
  onShuffle,
  onSetMeal,
  onRemove,
  onToggleUsed,
  onToggleExcludeFromGroceries,
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

  const dialogSubtitle = `${mealLabel} · ${formatDayLabel(slot.date)}`;
  const canEdit = Boolean(onSetMeal);
  const isEmpty = !recipe && !customMeal;

  const openDialog = () => {
    if (!canEdit) return;
    setIsDialogOpen(true);
  };

  const handleSaveMeal = async (payload: PlanSlotMealPayload) => {
    if (!onSetMeal) return;
    await onSetMeal(payload);
    setIsDialogOpen(false);
  };

  const stockedCardClassName = slot.excludeFromGroceries
    ? "ring-1 ring-muted"
    : undefined;

  if (isEmpty) {
    return (
      <>
        <div className="flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-dashed border-border/60 bg-card p-0 py-0 shadow-none transition-colors">
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
            title="Add meal"
            subtitle={dialogSubtitle}
            recipes={recipes}
            ingredientOptions={ingredientOptions}
            initialRecipeId={null}
            initialCustomName=""
            initialRows={[]}
            isSaving={false}
            onCancel={() => setIsDialogOpen(false)}
            onSave={handleSaveMeal}
          />
        ) : null}
      </>
    );
  }

  if (customMeal) {
    const canShuffle = false;

    return (
      <>
        <Card
          className={cn(
            "card-interactive h-full gap-0 overflow-hidden border-border py-0",
            slot.used && "opacity-50",
            stockedCardClassName,
            canEdit && "cursor-pointer",
          )}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button")) return;
            openDialog();
          }}
        >
          <div className="relative w-full overflow-hidden aspect-2/1 sm:aspect-3/2">
            {/* Custom meals have no cook time — use a larger placeholder icon instead of a time badge. */}
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
                {slot.excludeFromGroceries ? (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Stocked
                  </Badge>
                ) : null}
              </div>
              <SlotActionRow
                slot={slot}
                canShuffle={canShuffle}
                canEdit={canEdit}
                onEdit={openDialog}
                onRemove={onRemove}
                onToggleUsed={onToggleUsed}
                onToggleExcludeFromGroceries={onToggleExcludeFromGroceries}
              />
            </div>
          </CardHeader>
        </Card>

        {canEdit ? (
          <PlanSlotMealDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            title="Edit meal"
            subtitle={dialogSubtitle}
            recipes={recipes}
            ingredientOptions={ingredientOptions}
            initialRecipeId={null}
            initialCustomName={customMeal.name}
            initialRows={customMeal.ingredients.map((row) => ({
              ingredientId: row.ingredientId,
              unitId: row.unitId,
              amount: row.amount,
            }))}
            isSaving={false}
            onCancel={() => setIsDialogOpen(false)}
            onSave={handleSaveMeal}
          />
        ) : null}
      </>
    );
  }

  const imageUrl = getRecipeDisplayImageUrl(recipe!.images);
  const canShuffle = Boolean(onShuffle && slot.alternatives.length > 0);

  return (
    <>
      <Card
        className={cn(
          "card-interactive h-full gap-0 overflow-hidden border-border py-0",
          slot.used && "opacity-50",
          stockedCardClassName,
          canEdit && "cursor-pointer",
        )}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button") || target.closest("a")) return;
          openDialog();
        }}
      >
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
        </div>
        <CardHeader className="px-card-x py-card-y">
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/recipes/${recipe!.slug}`}
                  className="block hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h3 className="truncate type-h3" title={recipe!.name}>
                    {recipe!.name}
                  </h3>
                </Link>
                <p className="type-body mt-0.5 text-sm text-muted-foreground">
                  {mealLabel}
                </p>
                {slot.excludeFromGroceries ? (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Stocked
                  </Badge>
                ) : null}
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
            <SlotActionRow
              slot={slot}
              canShuffle={canShuffle}
              canEdit={canEdit}
              onEdit={openDialog}
              onShuffle={onShuffle}
              onRemove={onRemove}
              onToggleUsed={onToggleUsed}
              onToggleExcludeFromGroceries={onToggleExcludeFromGroceries}
            />
          </div>
        </CardHeader>
      </Card>

      {canEdit ? (
        <PlanSlotMealDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Edit meal"
          subtitle={dialogSubtitle}
          recipes={recipes}
          ingredientOptions={ingredientOptions}
          initialRecipeId={recipe!.id}
          initialCustomName=""
          initialRows={[]}
          isSaving={false}
          onCancel={() => setIsDialogOpen(false)}
          onSave={handleSaveMeal}
        />
      ) : null}
    </>
  );
}
