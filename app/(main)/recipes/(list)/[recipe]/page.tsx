import RecipePageContainer from "@/components/recipes/recipe-page-container";

type PageProps = {
  params: Promise<{ recipe: string }>;
};

export default async function RecipePage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  // Keep recipe detail route behavior unchanged in grouped structure.
  return <RecipePageContainer recipeSlug={recipeSlug} />;
}
