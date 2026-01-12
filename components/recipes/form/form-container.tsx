import { getCategories } from "@/lib/db/categories";
import RecipeForm from "@/components/recipes/form/index";

export default async function RecipeFormContainer() {
  const categories = await getCategories();

  return (
    <div className="max-w-xl mx-auto mt-10">
      <RecipeForm categories={categories} />
    </div>
  );
}
