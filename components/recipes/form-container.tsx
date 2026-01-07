import CreateRecipeForm from "@/components/recipes/form";
import { getCategories } from "@/lib/db/categories";

export default async function CreateRecipeFormContainer() {
  const categories = await getCategories();

  return (
    <div className="max-w-xl mx-auto mt-10">
      <CreateRecipeForm categories={categories} />
    </div>
  );
}
