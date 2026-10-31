import { getRecipes } from "@/lib/db/recipes";
import RecipeGrid from "./grid";
import { requireUser } from "@/lib/auth/session";

export type RecipeGridContainerProps = {
  occasion?: string;
  search?: string;
  protein?: string;
  type?: string;
  time?: string;
  archived?: boolean;
};

export default async function RecipeGridContainer({
  occasion,
  search,
  protein,
  type,
  time,
  archived = false,
}: RecipeGridContainerProps) {
  const { id: userId } = await requireUser();

const handsOnTimeMax = time ? Number(time) : undefined;

  const recipes = await getRecipes(userId, occasion, search, undefined, {
    proteinSlug: protein,
    typeSlug: type,
    handsOnTimeMax,
    archived,
  });

  return (
    <RecipeGrid
      recipes={recipes}
      archived={archived}
      hasFilters={Boolean(occasion || search || protein || type || time)}
    />
  );
}
