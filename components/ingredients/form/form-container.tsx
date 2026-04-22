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
    <>
      {/* Let page routes control layout so ingredient pages match recipe page rules. */}
      <IngredientForm
        categories={categories}
        units={units}
        gramsUnitId={gramsUnitId}
        iconOptions={iconOptions}
        ingredient={ingredient ?? undefined}
      />
    </>
  );
}
