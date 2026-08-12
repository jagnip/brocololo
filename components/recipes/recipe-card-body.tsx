import type { ReactNode } from "react";
import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
import { getProteinBadgeVariant } from "@/lib/recipes/protein-badge-variant";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";
import { cn } from "@/lib/utils";

type RecipeCardBodyProps = {
  recipe: RecipeType;
  className?: string;
  /** Extra content overlaid on the image area (e.g. selection checkmark). */
  imageOverlay?: ReactNode;
  /** Extra line under the recipe name (e.g. "Current" label). */
  nameFooter?: ReactNode;
};

/** Presentational recipe card shared by the recipes page and meal picker. */
export function RecipeCardBody({
  recipe,
  className,
  imageOverlay,
  nameFooter,
}: RecipeCardBodyProps) {
  const imageUrl = getRecipeDisplayImageUrl(recipe.images);

  const proteinCategories = recipe.categories.filter(
    (category) => category.type === "PROTEIN",
  );

  return (
    <Card
      className={cn(
        "card-interactive h-full cursor-pointer overflow-hidden py-0 gap-0",
        className,
      )}
    >
      <div className="relative w-full overflow-hidden aspect-2/1 sm:aspect-3/2">
        {/* Keep card heights stable when a recipe has no uploaded image. */}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={recipe.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <RecipeImagePlaceholder />
        )}
        {imageOverlay}
      </div>
      <CardHeader className="flex-1 px-card-x py-card-y">
        <div className="min-w-0">
          <h3 className="truncate type-h3" title={recipe.name}>
            {recipe.name}
          </h3>
          {nameFooter}
          <div className="mt-item flex items-center gap-tight overflow-hidden whitespace-nowrap">
            <Badge variant="outline">{recipe.handsOnTime} min</Badge>
            {proteinCategories.length > 0 &&
              proteinCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant={getProteinBadgeVariant(category.slug)}
                  className="text-xs"
                >
                  {category.name}
                </Badge>
              ))}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
