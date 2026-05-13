import RecipeFormContainer from "@/components/recipes/form/form-container";
import { TopbarConfigController } from "@/components/topbar-config";

export default async function CreateRecipePage() {
  return (
    <div className="page-container">
      <TopbarConfigController
        config={{
          actions: [],
        }}
      />
      {/* Keep create form content unchanged while moving route boundaries. */}
      <RecipeFormContainer />
    </div>
  );
}
