import { getCategoriesByType } from "@/lib/db/categories";
import { RecipeTabs } from "./tabs";

export async function RecipeTabsContainer() {
  const [flavourCategories, proteinCategories, typeCategories] =
    await Promise.all([
      getCategoriesByType("FLAVOUR"),
      getCategoriesByType("PROTEIN"),
      getCategoriesByType("RECIPE_TYPE"),
    ]);

  return (
    <RecipeTabs
      flavourCategories={flavourCategories}
      proteinCategories={proteinCategories}
      typeCategories={typeCategories}
    />
  );
}
