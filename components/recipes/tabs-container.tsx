import { getCategoriesByType } from "@/lib/db/categories";
import { RecipeTabs } from "./tabs";

export async function RecipeTabsContainer() {
  const [mealOccasionCategories, proteinCategories, typeCategories] =
    await Promise.all([
      getCategoriesByType("MEAL_OCCASION"),
      getCategoriesByType("PROTEIN"),
      getCategoriesByType("RECIPE_TYPE"),
    ]);

  return (
    <RecipeTabs
      mealOccasionCategories={mealOccasionCategories}
      proteinCategories={proteinCategories}
      typeCategories={typeCategories}
    />
  );
}
