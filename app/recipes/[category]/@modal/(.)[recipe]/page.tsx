import RecipeDialog from "@/components/recipes/recipe-dialog";
import { recipesData } from "@/lib/recipes-data";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipeModalPage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  //This gonna block Suspense streaming until the categories are loaded
  //Use use() from React from Clinet Server Insight lesson
  const recipe = recipesData.find((r) => r.slug === recipeSlug);

  if (!recipe) {
    notFound();
  }

  return <RecipeDialog recipe={recipe} />;
}
