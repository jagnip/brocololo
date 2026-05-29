import RecipeFormContainer from "@/components/recipes/form/form-container";

type PageProps = {
  params: Promise<{ recipe: string }>;
};

export default async function EditRecipePage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  return (
    <div className="page-container">
      {/* Top bar actions + breadcrumbs come from RecipeForm (TopbarConfigController). */}
      <RecipeFormContainer recipeSlug={recipeSlug} />
    </div>
  );
}
