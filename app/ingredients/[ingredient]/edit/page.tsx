import IngredientFormContainer from "@/components/ingredients/form/form-container";

type PageProps = {
  params: Promise<{ ingredient: string }>;
};

export default async function EditIngredientPage({ params }: PageProps) {
  const { ingredient: ingredientSlug } = await params;

  return (
    <div className="page-container">
      {/* Use the shared container with slug for edit mode. */}
      <IngredientFormContainer ingredientSlug={ingredientSlug} />
    </div>
  );
}
