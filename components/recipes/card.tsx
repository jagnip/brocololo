"use client";

import type { RecipeType } from "@/types/recipe";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RecipeCardBody } from "./recipe-card-body";

type RecipeCardProps = {
  recipe: RecipeType;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const searchParams = useSearchParams();
  // Preserve list filters, but never carry a planner cook hand-off between recipes.
  const params = new URLSearchParams(searchParams.toString());
  params.delete("cook");
  const queryString = params.toString();

  const url = `/recipes/${recipe.slug}${queryString ? `?${queryString}` : ""}`;

  return (
    <Link href={url} scroll={false}>
      <RecipeCardBody recipe={recipe} />
    </Link>
  );
}
