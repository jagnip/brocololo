import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import type { IngredientType } from "@/types/ingredient";

/** Maps catalog ingredients to the shape expected by meal/log ingredient editors. */
export function ingredientsToLogIngredientOptions(
  ingredients: IngredientType[],
): LogIngredientOption[] {
  return ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    brand: ingredient.brand,
    descriptor: ingredient.descriptor,
    category: { name: ingredient.category.name },
    defaultUnitId: ingredient.defaultUnitId,
    calories: ingredient.calories,
    proteins: ingredient.proteins,
    fats: ingredient.fats,
    carbs: ingredient.carbs,
    unitConversions: ingredient.unitConversions.map((conversion) => ({
      unitId: conversion.unitId,
      gramsPerUnit: conversion.gramsPerUnit,
      unitName: conversion.unit.name,
      unitNamePlural: conversion.unit.namePlural ?? null,
    })),
  }));
}
