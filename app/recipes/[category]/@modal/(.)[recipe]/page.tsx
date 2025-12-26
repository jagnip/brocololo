import RecipeDialogContainer from "@/components/recipes/recipe-dialog-container";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipeModalPage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  return <RecipeDialogContainer recipeSlug={recipeSlug} />;
}
