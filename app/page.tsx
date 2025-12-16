import { getCategories, getRecipes } from "@/lib/db";
import { CategoryType } from "@/types/category";
import { RecipeType } from "@/types/recipe";
import { revalidatePath } from "next/cache";
import Link from "next/link";


export default async function Page() {
  async function revalidateAction(formData: FormData) {
    "use server";
    revalidatePath("/");
  }

  const categories = await getCategories();
  const recipes = await getRecipes();

  return (
    <div>
      <header className="flex gap-1 sticky top-0 z-10 bg-background border-b">
        {categories.map((category: CategoryType) => (
          <div key={category.id}>
            <Link href="/category">{category.name}</Link>
          </div>
        ))}
      </header>
      <div>
        <form>
          <button formAction={revalidateAction}>Purge cache</button>
        </form>
      </div>
      <div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {recipes.map((recipe: RecipeType) => (
          <div key={recipe.id} className="flex flex-col gap-2">
            <img
              src={recipe.photo}
              alt={recipe.name}
              width={300}
              height={300}
              className="w-full h-auto rounded"
            />
            <div>
              <p>{recipe.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
