import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  getGramsUnit,
  getIngredientCategories,
  getIngredientBySlug,
} from "@/lib/db/ingredients";
import { getUnits } from "@/lib/db/units";

async function getIngredientIconOptions() {
  const iconDirectory = path.join(process.cwd(), "public", "icons", "ingredients");
  const files = await readdir(iconDirectory);

  return files
    .filter((file) => file.endsWith(".svg") && file !== "fallback.svg")
    .sort((a, b) => a.localeCompare(b));
}

// Share ingredient-form dependencies between page and dialog contexts.
export async function getIngredientFormDependencies() {
  const [categories, units, gramsUnit, iconOptions] = await Promise.all([
    getIngredientCategories(),
    getUnits(),
    getGramsUnit(),
    getIngredientIconOptions(),
  ]);

  if (!gramsUnit) {
    throw new Error("Required unit 'g' is missing from database");
  }

  return {
    categories,
    units,
    gramsUnitId: gramsUnit.id,
    iconOptions,
  };
}

export async function getIngredientBySlugOrNull(ingredientSlug?: string) {
  if (!ingredientSlug) {
    return null;
  }

  return getIngredientBySlug(ingredientSlug);
}
