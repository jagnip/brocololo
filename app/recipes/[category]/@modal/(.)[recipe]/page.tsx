import { notFound } from "next/navigation";
import { recipesData } from "@/lib/recipes-data";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipeModalPage({ params }: PageProps) {
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
return <div>Recipe modal page</div>;
}
