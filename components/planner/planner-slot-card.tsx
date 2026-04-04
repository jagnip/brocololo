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
  proteinColor?: string;
  onShuffle?: () => void;
  onReplace?: (recipe: RecipeType) => void;
  onRemove?: () => void;
  onToggleUsed?: () => void;
  recipes?: RecipeType[];
};

export function PlannerSlotCard({
  slot,
  fridgeMatchIngredients,
  proteinColor: accentColor,
  onShuffle,
  onReplace,
  onRemove,
  onToggleUsed,
  recipes,
}: PlannerSlotCardProps) {
  const { recipe } = slot;

  if (!recipe) {
    const canAdd = onReplace && recipes && recipes.length > 0;
    return (
      <Card className="relative flex items-center justify-center min-h-[120px] border-dashed">
        {canAdd && (
          <RecipeReplacePopover
            currentRecipeId=""
            recipes={recipes}
            onReplace={onReplace}
          />
        )}
      </Card>
    );
  }

  const coverImage = recipe.images?.find((img) => img.isCover);
  const proteinCategories = recipe.categories.filter(
    (category) => category.type === "PROTEIN",
  );
  const canShuffle = onShuffle && slot.alternatives.length > 0;
  const canReplace = onReplace && recipes && recipes.length > 0;

  return (
    <Card
      className={cn(
        "relative transition-shadow",
        accentColor && `border-l-4 ${accentColor}`,
        slot.used && "opacity-50",
      )}
    >
      {coverImage && (
        <Image
          src={coverImage.url}
          alt={recipe.name}
          width={300}
          height={300}
          className="w-full h-auto rounded-xl"
        />
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Link href={`/recipes/${recipe.slug}`} className="hover:underline">
              <h3 className="font-medium">{recipe.name}</h3>
            </Link>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline">{recipe.handsOnTime} min</Badge>
              {proteinCategories.length > 0 &&
                proteinCategories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {category.name}
                  </Badge>
                ))}
              {fridgeMatchIngredients &&
                fridgeMatchIngredients.length > 0 &&
                fridgeMatchIngredients.map((name) => (
                  <Badge
                    key={name}
                    className="bg-green-100 text-green-800 border-green-200 text-xs"
                  >
                    {name}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      </CardHeader>
      {(canShuffle || canReplace || onRemove || onToggleUsed) && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {onToggleUsed && (
            <Button
              type="button"
              variant={slot.used ? "default" : "secondary"}
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm"
              onClick={onToggleUsed}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {canShuffle && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm"
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
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
