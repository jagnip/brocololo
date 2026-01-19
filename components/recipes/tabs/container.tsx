import { getCategories } from "@/lib/db/categories";
import { RecipeTabs } from ".";


export async function RecipeTabsContainer() {
  const categories = await getCategories();

  return (
    <header className="flex flex-wrap items-center justify-between sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <RecipeTabs categories={categories} />
    </header>
  );
}
