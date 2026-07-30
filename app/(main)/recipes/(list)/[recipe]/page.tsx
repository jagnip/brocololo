import RecipePageContainer from "@/components/recipes/recipe-page-container";

type PageProps = {
  params: Promise<{ recipe: string }>;
  searchParams: Promise<{ cook?: string | string[] }>;
};

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function RecipePage({ params, searchParams }: PageProps) {
  const { recipe: recipeSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const cook = firstSearchParam(resolvedSearchParams.cook);

  // Keep recipe detail route behavior unchanged in grouped structure.
  return (
    <RecipePageContainer recipeSlug={recipeSlug} cookParam={cook} />
  );
}
