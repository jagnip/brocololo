import CategoriesHeader from "@/components/categories-header";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { getCategories, getRecipes } from "@/lib/db";
import { revalidatePath } from "next/cache";


export default async function Page() {
  // async function revalidateAction(formData: FormData) {
  //   "use server";
  //   revalidatePath("/");
  // }

  const categories = await getCategories();
  const recipes = await getRecipes();

  return (
    <div>
      <CategoriesHeader categories={categories} />
      {/* <div>
        <form>
          <button formAction={revalidateAction}>Purge cache</button>
        </form>
      </div> */}
      <RecipeGrid recipes={recipes} />
    </div>
  );
}
