import IngredientFormContainer from "@/components/ingredients/form/form-container";

export default async function CreateIngredientPage() {
  return (
    <div className="mx-auto mt-10">
      {/* Use the shared container without slug for create mode. */}
      <IngredientFormContainer />
    </div>
  );
}
