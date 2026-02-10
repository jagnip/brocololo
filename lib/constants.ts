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


export const HANDS_ON_DEFAULTS: Record<number, { breakfast: number | null; lunch: number | null; dinner: number | null }> = {
  0: { breakfast: 30, lunch: 30, dinner: 45 },  // Sunday
  1: { breakfast: 15, lunch: 15, dinner: 25 },  // Monday
  2: { breakfast: 15, lunch: 15, dinner: 25 },  // Tuesday
  3: { breakfast: 15, lunch: 15, dinner: 25 },  // Wednesday
  4: { breakfast: 15, lunch: 15, dinner: 25 },  // Thursday
  5: { breakfast: 15, lunch: 15, dinner: 25 },  // Friday
  6: { breakfast: 30, lunch: 30, dinner: 45 },  // Saturday
};