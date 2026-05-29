import { getRecipes } from "@/lib/db/recipes";
import RecipeGrid from "./grid";
import { requireUser } from "@/lib/auth/session";

export type RecipeGridContainerProps = {
  occasion?: string;
  search?: string;
  protein?: string;
  type?: string;
  time?: string;
};

export default async function RecipeGridContainer({
  occasion,
  search,
  protein,
  type,
  time,
}: RecipeGridContainerProps) {
  const { id: userId } = await requireUser();

const handsOnTimeMax = time ? Number(time) : undefined;

  const recipes = await getRecipes(userId, occasion, search, undefined, {
    proteinSlug: protein,
    typeSlug: type,
    handsOnTimeMax,
  });

  return <RecipeGrid recipes={recipes} />;
}
