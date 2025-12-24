import { notFound } from "next/navigation";
import { recipesData } from "@/lib/recipes-data";
// import RecipeDialog from "@/components/recipes/recipe-dialog";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipePage({ params }: PageProps) {
  const { category, recipe: recipeSlug } = await params;

  //   const recipe = recipesData.find((r) => r.slug === recipeSlug);

  //   if (!recipe) {
  //     notFound();
  //   }

  //   // Verify recipe belongs to category (if not "all")
  //   if (category !== "all" && !recipe.categorySlugs.includes(category)) {
  //     notFound();
  //   }

  //   return <RecipeDialog recipe={recipe} />;
  return (
    <div>
      RECIPE <b>PAGE</b>
    </div>
  );
}
