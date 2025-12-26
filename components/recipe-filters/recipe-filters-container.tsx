import type { CategoryType } from "@/types/category";
import { categoriesData } from "@/lib/categories-data";
import { notFound } from "next/navigation";
import RecipeFilters from "./recipe-filters";

type RecipeFiltersContainerProps = {
  activeCategorySlug: string;
};

export default function RecipeFiltersContainer({
  activeCategorySlug,
}: RecipeFiltersContainerProps) {
  const categories = categoriesData;

  if (activeCategorySlug !== "all") {
    const categoryExists = categories.some(
      (cat) => cat.slug === activeCategorySlug
    );

    if (!categoryExists) {
      notFound();
    }
  }

  return (
    <RecipeFilters
      categories={categories}
      activeCategorySlug={activeCategorySlug}
    />
  );
}
