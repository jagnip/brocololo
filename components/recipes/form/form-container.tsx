
import { getCategories } from "@/lib/db/categories";
import CreateRecipeForm from "@/components/recipes/form/index";

export default async function CreateRecipeFormContainer() {
  const categories = await getCategories();

  return (
    <div className="max-w-xl mx-auto mt-10">
      <CreateRecipeForm categories={categories} />
    </div>
  );
}
