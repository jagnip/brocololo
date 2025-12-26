"use client";

import type { RecipeType } from "@/types/recipe";
import { useParams, usePathname, useRouter } from "next/navigation";
import { recipesData } from "@/lib/recipes-data";
import RecipeDialog from "./recipe-dialog";

type RecipeDialogContainerProps = {
  recipeSlug: string;
};

export default function RecipeDialogContainer({
  recipeSlug,
}: RecipeDialogContainerProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const category = params.category as string;
  const recipe = recipesData.find((r) => r.slug === recipeSlug);

  if (!recipe) {
    router.push("/404");
    return null;
  }

  const isRecipeRoute = pathname?.includes(`/${category}/${recipe.slug}`);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      router.push(`/recipes/${category}`, { scroll: false });
    }
  };

  if (!isRecipeRoute) {
    return null;
  }

  return <RecipeDialog recipe={recipe} onOpenChange={handleOpenChange} />;
}
