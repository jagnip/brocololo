"use client";

import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { useSearchParams } from "next/navigation";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/helpers";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";

type RecipeCardProps = {
  recipe: RecipeType;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const url = `/recipes/${recipe.slug}${queryString ? `?${queryString}` : ""}`;

  const imageUrl = getRecipeDisplayImageUrl(recipe.images);

  const proteinCategories = recipe.categories.filter(
    (category) => category.type === "PROTEIN",
  );

  return (
    <Link href={url} scroll={false} >
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md overflow-hidden py-0 gap-0">
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
        </div>
        <CardHeader className="flex-1 px-card-x py-card-y">
          <div className="min-w-0">
            <h3 className="truncate type-h3" title={recipe.name}>
              {recipe.name}
            </h3>
            <div className="mt-item flex items-center gap-tight overflow-hidden whitespace-nowrap">
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
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
