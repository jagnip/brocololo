"use client";

import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";

type RecipeCardProps = {
  recipe: RecipeType;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const url = `/recipes/${recipe.slug}`;

  return (
    <Link href={url} scroll={false}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <Image
          src={recipe.photo}
          alt={recipe.name}
          width={300}
          height={300}
          className="w-full h-auto rounded-xl"
        />
        <CardHeader>
          {recipe.name} <Badge>{recipe.handsOnTime}</Badge>
        </CardHeader>
      </Card>
    </Link>
  );
}
