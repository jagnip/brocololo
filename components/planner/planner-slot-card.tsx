"use client";

import type { SlotInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Shuffle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecipeReplacePopover } from "./recipe-replace-popover";

type PlannerSlotCardProps = {
  slot: SlotInputType;
  fridgeMatchIngredients?: string[];
  onShuffle?: () => void;
  onReplace?: (recipe: RecipeType) => void;
  onRemove?: () => void;
  onToggleUsed?: () => void;
  recipes?: RecipeType[];
};

export function PlannerSlotCard({
  slot,
  fridgeMatchIngredients,
  onShuffle,
  onReplace,
  onRemove,
  onToggleUsed,
  recipes,
}: PlannerSlotCardProps) {
  const { recipe } = slot;

  if (!recipe) {
    const canAdd = onReplace && recipes && recipes.length > 0;
    const mealLabel =
      slot.mealType === "BREAKFAST"
        ? "Breakfast"
        : slot.mealType === "LUNCH"
          ? "Lunch"
          : "Dinner";

    return (
      <div className="flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-dashed border-border/60 bg-card p-0 py-0 shadow-none transition-colors">
        {canAdd ? (
          <RecipeReplacePopover
            currentRecipeId=""
            recipes={recipes}
            onReplace={onReplace}
            buttonVariant="ghost"
            buttonSize="default"
            buttonClassName="flex min-h-0 h-full flex-1 flex-col items-center justify-center gap-2 rounded-none p-3 text-center shadow-none hover:bg-muted/40"
            triggerContent={
              <>
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                  aria-hidden
                >
                  <span className="text-base leading-none">+</span>
                </span>
                <p className="text-sm font-medium leading-snug text-foreground">
                  {mealLabel}
                </p>
                <span className="text-xs text-muted-foreground">Add recipe</span>
              </>
            }
          />
        ) : null}
      </div>
    );
  }

  const coverImage = recipe.images?.find((img) => img.isCover);
  const canShuffle = onShuffle && slot.alternatives.length > 0;
  const canReplace = onReplace && recipes && recipes.length > 0;

  return (
    <Card
      className={cn(
        "h-full overflow-hidden py-0 gap-0 transition-shadow",
        slot.used && "opacity-50",
      )}
    >
      {coverImage && (
        <div className="relative w-full overflow-hidden aspect-2/1 sm:aspect-3/2">
          <Image
            src={coverImage.url}
            alt={recipe.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <CardHeader className="px-card-x py-card-y">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <Link href={`/recipes/${recipe.slug}`} className="min-w-0 flex-1 hover:underline">
              <h3 className="truncate type-h3" title={recipe.name}>
                {recipe.name}
              </h3>
            </Link>
            <Badge variant="outline" className="shrink-0">
              {recipe.handsOnTime} min
            </Badge>
          </div>
          <div className="mt-item flex flex-wrap items-start gap-2">
            {fridgeMatchIngredients &&
              fridgeMatchIngredients.length > 0 &&
              fridgeMatchIngredients.map((name) => (
                <Badge
                  key={name}
                  className="border-green-200 bg-green-100 text-green-800 text-xs"
                >
                  {name}
                </Badge>
              ))}
          </div>
          {(canShuffle || canReplace || onRemove || onToggleUsed) && (
            <div className="mt-item flex w-full justify-start gap-1">
              {onToggleUsed && (
                <Button
                  type="button"
                  variant={slot.used ? "default" : "outline"}
                  size="icon"
                  onClick={onToggleUsed}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              {canShuffle && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onShuffle}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              )}
              {canReplace && (
                <RecipeReplacePopover
                  currentRecipeId={recipe.id}
                  recipes={recipes}
                  onReplace={onReplace}
                />
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
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
