import { getCategories } from "@/lib/db/categories";
import RecipeForm from "@/components/recipes/form/index";
import { RecipeType } from "@/types/recipe";

export default async function RecipeFormContainer({ recipe }: { recipe?: RecipeType }) {
  const categories = await getCategories();

  return (
    <div className="max-w-xl mx-auto mt-10">
      <RecipeForm categories={categories} recipe={recipe} />
    </div>
  );
}
