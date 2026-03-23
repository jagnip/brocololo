import { getRecipes } from "@/lib/db/recipes";
import RecipeGrid from "./grid";

export type RecipeGridContainerProps = {
  flavour?: string;
  search?: string;
  protein?: string;
  type?: string;
  time?: string;
};

export default async function RecipeGridContainer({
  flavour,
  search,
  protein,
  type,
  time,
}: RecipeGridContainerProps) {
  // Keep prop names aligned with URL/search params, then adapt for DB helper.
  const flavourSlugs = flavour ? [flavour] : [];

  // Translate single-select time key into numeric DB filter.
  const handsOnTimeMax =
    time === "lte20" ? 20 : time === "lte30" ? 30 : undefined;

  const recipes = await getRecipes(flavourSlugs, search, undefined, {
    proteinSlug: protein,
    typeSlug: type,
    handsOnTimeMax,
  });

  return <RecipeGrid recipes={recipes} />;
}
