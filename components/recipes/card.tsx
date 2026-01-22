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
    (category) => category.type === "PROTEIN"
  );

  return (
    <Link href={url} scroll={false}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
              <h3 className="font-medium">{recipe.name}</h3>
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
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
