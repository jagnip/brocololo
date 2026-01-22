import { getCategories, getCategoriesByType } from "@/lib/db/categories";
import { RecipeTabs } from "./tabs";


export async function RecipeTabsContainer() {
   const categories = await getCategoriesByType("FLAVOUR");

  return (
    <header className="flex flex-wrap items-center justify-between sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <RecipeTabs categories={categories} />
    </header>
  );
}
