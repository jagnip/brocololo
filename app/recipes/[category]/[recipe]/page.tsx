import { notFound } from "next/navigation";
import { recipesData } from "@/lib/recipes-data";
// import RecipeDialog from "@/components/recipes/recipe-dialog";

type PageProps = {
  params: Promise<{ recipe: string }>;
};

export default async function RecipePage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  //   const recipe = recipesData.find((r) => r.slug.toString() === recipeSlug);

  //   if (!recipe) {
  //     notFound();
  //   }

  //   // Verify recipe belongs to category (if not "all")
  //   if (category !== "all" && !recipe.categorySlugs.includes(category)) {
  //     notFound();
  //   }

  //   return <RecipeDialog recipe={recipe} />;
  return <div>Recipe</div>;
}
