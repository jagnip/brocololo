import RecipeDialogContainer from "@/components/recipes/dialog-container";

type PageProps = {
  params: Promise<{ recipe: string }>;
};

export default async function RecipeModalPage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  return <RecipeDialogContainer recipeSlug={recipeSlug} />;
}
