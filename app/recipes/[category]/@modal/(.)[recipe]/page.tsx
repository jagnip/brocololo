import { notFound } from "next/navigation";
import { recipesData } from "@/lib/recipes-data";
import RecipeDialog from "@/components/recipes/recipe-dialog";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipeModalPage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

    return <RecipeDialog recipeSlug={recipeSlug} />;

}
