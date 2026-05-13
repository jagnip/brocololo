import RecipeFormContainer from "@/components/recipes/form/form-container";

export default async function CreateRecipePage() {
  return (
    <div className="page-container">
      {/* Top bar actions + breadcrumbs come from RecipeForm (TopbarConfigController). */}
      <RecipeFormContainer />
    </div>
  );
}
