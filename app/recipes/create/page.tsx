import RecipeFormContainer from "@/components/recipes/form/form-container";
import { PageHeader } from "@/components/page-header";
import { TopbarConfigController } from "@/components/topbar-config";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ROUTES } from "@/lib/constants";

export default async function CreateRecipePage() {
  return (
    <div className="page-container">
      <TopbarConfigController
        config={{
          actions: [],
        }}
      />
      <PageHeader title="Create recipe" className="pb-2" />
      <Breadcrumbs
        items={[
          { label: "Recipes", href: ROUTES.recipes },
          { label: "Create recipe" },
        ]}
        className="pb-4"
      />
      <RecipeFormContainer />
    </div>
  );
}
