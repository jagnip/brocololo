import RecipeDialog from "@/components/recipes/dialog";
import { recipesData } from "@/lib/recipes-data";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipePage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  //Pass recipe slug and fetch in RecipeDialog component
  const recipe = recipesData.find((r) => r.slug === recipeSlug);

  if (!recipe) {
    notFound();
  }

  return <RecipeDialog recipe={recipe} />;
}
