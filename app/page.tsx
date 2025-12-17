import RecipeGrid from "@/components/recipes/recipe-grid";
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
      <RecipeGrid recipes={recipes} />
    </div>
  );
}
