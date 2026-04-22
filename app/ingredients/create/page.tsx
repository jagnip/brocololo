import IngredientFormContainer from "@/components/ingredients/form/form-container";

export default async function CreateIngredientPage() {
  return (
    <div className="page-container">
      {/* Use the shared container without slug for create mode. */}
      <IngredientFormContainer />
    </div>
  );
}
