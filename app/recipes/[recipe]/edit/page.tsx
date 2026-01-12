import RecipeFormContainer from "@/components/recipes/form/form-container";

type PageProps = {
  params: Promise<{ recipe: string }>;
};

export default async function EditRecipePage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  return (
    <div className="max-w-xl mx-auto mt-10">
    <RecipeFormContainer />
    </div>
  );
}