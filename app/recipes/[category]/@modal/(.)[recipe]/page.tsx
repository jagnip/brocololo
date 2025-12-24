import { notFound } from "next/navigation";
import { recipesData } from "@/lib/recipes-data";
import RecipeDialog from "@/components/recipes/recipe-dialog";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipeModalPage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  console.log('recipeSlug', recipeSlug);

    const recipe = recipesData.find((r) => r.slug === recipeSlug);

    if (!recipe) {
      notFound();
    }

    return <RecipeDialog recipe={recipe} />;
    // return <div>RECIPE <b>MODAL</b></div>;

}
