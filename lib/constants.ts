import { MealType } from "@/src/generated/enums";

export const FLAVOUR_BREADCRUMB_LABELS: Record<string, string> = {
  sweet: "Sweet",
  savoury: "Savoury",
};

export const MEAL_TYPES: MealType[] = [
  MealType.BREAKFAST,
  MealType.LUNCH,
  MealType.DINNER,
];

export const ROUTES = {
  recipes: "/recipes",
  recipeCreate: "/recipes/create",
  recipe: (slug: string) => `/recipes/${slug}`,
  recipeEdit: (slug: string) => `/recipes/${slug}/edit`,
  plan: "/plan",
  planCreate: "/plan/create",
  planView: (planId: string) => `/plan/${planId}`,
} as const;