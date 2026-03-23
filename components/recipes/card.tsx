"use client";

import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { useSearchParams } from "next/navigation";

type RecipeCardProps = {
  recipe: RecipeType;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const url = `/recipes/${recipe.slug}${queryString ? `?${queryString}` : ""}`;

  const coverImage = recipe.images?.find((img) => img.isCover);

  const proteinCategories = recipe.categories.filter(
    (category) => category.type === "PROTEIN",
  );

  return (
    <Link href={url} scroll={false} >
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md overflow-hidden py-0 gap-0">
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
        <CardHeader className="flex-1 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate font-medium" title={recipe.name}>
              {recipe.name}
            </h3>
            <div className="mt-2 flex items-center gap-1 overflow-hidden whitespace-nowrap">
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
