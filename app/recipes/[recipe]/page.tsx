import RecipePageContainer from "@/components/recipes/recipe-page-container";

type PageProps = {
  params: Promise<{ recipe: string }>;
};

export default async function RecipeModalPage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  return <RecipePageContainer recipeSlug={recipeSlug} />;
}
