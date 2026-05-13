import RecipeFormContainer from "@/components/recipes/form/form-container";
import { TopbarConfigController } from "@/components/topbar-config";

type PageProps = {
  params: Promise<{ recipe: string }>;
};

export default async function EditRecipePage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  return (
    <div className="page-container">
      <TopbarConfigController
        config={{
          actions: [],
        }}
      />
      {/* Keep edit form behavior unchanged while isolating loading boundaries. */}
      <RecipeFormContainer recipeSlug={recipeSlug} />
    </div>
  );
}
