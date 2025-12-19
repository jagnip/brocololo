import { getRecipe, getRecipes, getCategories } from "@/lib/db";
import { RecipeDialog } from "@/components/recipes/recipe-dialog";
import RecipeGrid from "@/components/recipes/recipe-grid";
import CategoriesHeader from "@/components/categories/categories-header";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const [recipe, recipes, categories] = await Promise.all([
    getRecipe(slug),
    getRecipes(),
    getCategories(),
  ]);

  if (!recipe) {
    notFound();
  }

  return (
    <div>
      <CategoriesHeader categories={categories} />
      <RecipeGrid recipes={recipes} />
      <RecipeDialog recipe={recipe} open={true} />
    </div>
  );
}
