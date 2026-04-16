import RecipeFormContainer from "@/components/recipes/form/form-container";
import { TopbarConfigController } from "@/components/topbar-config";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ROUTES } from "@/lib/constants";

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
      <Breadcrumbs
        items={[
          { label: "Recipes", href: ROUTES.recipes },
          { label: "Edit recipe" },
        ]}
        className="pb-4"
      />
      <RecipeFormContainer recipeSlug={recipeSlug} />
    </div>
  );
}