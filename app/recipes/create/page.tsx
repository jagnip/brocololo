import CreateRecipeFormContainer from "@/components/recipes/form-container";

export const dynamic = "force-dynamic";

export default async function CreateRecipeDialogPage() {
  return (
    <div className="max-w-xl mx-auto mt-10">
      <CreateRecipeFormContainer />
    </div>
  );
}
