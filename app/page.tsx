import { revalidatePath } from "next/cache";
import Link from "next/link";

type RecipeType = {
  id: number;
  name: string;
  photo: string;
};

type CategoryType = {
  id: number;
  name: string;
};

const getCategories = async () => {
  const response = await fetch(categoriesURL);
  return await response.json();
};

const categories = await getCategories();

const recipesURL = "https://693ddb9df55f1be79303da63.mockapi.io/recipes";
const categoriesURL = "https://693ddb9df55f1be79303da63.mockapi.io/categories";

const getRecipes = async () => {
  const response = await fetch(recipesURL, { cache: "force-cache" });
  return await response.json();
};

export default async function Page() {
  async function revalidateAction(formData: FormData) {
    "use server";
    revalidatePath("/");
  }

  const recipes = await getRecipes();

  return (
    <div className="p-10">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex gap-2 p-4">
          {categories.map((category: CategoryType) => (
            <div key={category.id}>
              <Link href="/category">{category.name}</Link>
            </div>
          ))}
        </div>
      </header>
      <div className="my-4 flex items-center justify-between gap-6">
        <form>
          <button formAction={revalidateAction}>Purge cache</button>
        </form>
      </div>

      {recipes.map((recipe: RecipeType) => (
        <div key={recipe.id}>
          <img src={recipe.photo} alt={recipe.name} width={300} height={300} />
          <div>
            <p>{recipe.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
