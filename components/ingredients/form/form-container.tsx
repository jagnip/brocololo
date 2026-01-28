import { notFound } from "next/navigation";
import IngredientForm from "./ingredient-form";
import {
  getIngredientBySlugOrNull,
  getIngredientFormDependencies,
} from "./form-dependencies";

export default async function IngredientFormContainer({
  ingredientSlug,
}: {
  ingredientSlug?: string;
}) {
  const [{ categories, units, gramsUnitId, iconOptions }, ingredient] = await Promise.all([
    getIngredientFormDependencies(),
    getIngredientBySlugOrNull(ingredientSlug),
  ]);

  if (ingredientSlug && !ingredient) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto mt-10">
      {/* Share one form component for both create and edit flows. */}
      <IngredientForm
        categories={categories}
        units={units}
        gramsUnitId={gramsUnitId}
        iconOptions={iconOptions}
        ingredient={ingredient ?? undefined}
      />
    </div>
  );
}
