import { PlannerMealType } from "@/src/generated/enums";

export const FLAVOUR_BREADCRUMB_LABELS: Record<string, string> = {
  sweet: "Sweet",
  savoury: "Savoury",
};

export const MEAL_TYPES: PlannerMealType[] = [
  PlannerMealType.BREAKFAST,
  PlannerMealType.LUNCH,
  PlannerMealType.DINNER,
];

export const ROUTES = {
  recipes: "/recipes",
  recipeCreate: "/recipes/create",
  recipe: (slug: string) => `/recipes/${slug}`,
  recipeEdit: (slug: string) => `/recipes/${slug}/edit`,
  ingredients: "/ingredients",
  ingredientCreate: "/ingredients/create",
  ingredientEdit: (slug: string) => `/ingredients/${slug}/edit`,
  plan: "/plan",
  planCreate: "/plan/create",
  planView: (planId: string) => `/plan/${planId}`,
  groceries: "/groceries",
  groceriesView: (planId: string) => `/groceries/${planId}`,
} as const;


export type MealTimeLimits = {
  breakfastHandsOnMax: number | null;
  lunchHandsOnMax: number | null;
  dinnerHandsOnMax: number | null;
  breakfastTotalMax: number | null;
  lunchTotalMax: number | null;
  dinnerTotalMax: number | null;
};

// Shared grouped defaults for planner time limits.
export const WEEKDAY_TIME_LIMIT_DEFAULTS: MealTimeLimits = {
  breakfastHandsOnMax: 15,
  lunchHandsOnMax: 20,
  dinnerHandsOnMax: 25,
  breakfastTotalMax: null,
  lunchTotalMax: 30,
  dinnerTotalMax: 30,
};

// Weekend defaults are intentionally different from weekdays.
export const WEEKEND_TIME_LIMIT_DEFAULTS: MealTimeLimits = {
  breakfastHandsOnMax: 30,
  lunchHandsOnMax: 30,
  dinnerHandsOnMax: 40,
  breakfastTotalMax: null,
  lunchTotalMax: 30,
  dinnerTotalMax: null,
};

export const TIME_LIMIT_DEFAULTS: Record<number, MealTimeLimits> = {
  // Sunday
  0: { ...WEEKEND_TIME_LIMIT_DEFAULTS },
  // Monday
  1: { ...WEEKDAY_TIME_LIMIT_DEFAULTS },
  // Tuesday
  2: { ...WEEKDAY_TIME_LIMIT_DEFAULTS },
  // Wednesday
  3: { ...WEEKDAY_TIME_LIMIT_DEFAULTS },
  // Thursday
  4: { ...WEEKDAY_TIME_LIMIT_DEFAULTS },
  // Friday
  5: { ...WEEKDAY_TIME_LIMIT_DEFAULTS },
  // Saturday
  6: { ...WEEKEND_TIME_LIMIT_DEFAULTS },
};

//Add more categories that you want to group here
export const PROTEIN_GROUP_MAP: Record<string, string> = {
  beef: "red-meat",
  pork: "red-meat",
  eggs: "vegetarian",
  tofu: "vegetarian",
  dairy: "vegetarian",
  turkey: "poultry",
  chicken: "poultry",
};

//Sum should be 1.0, add categories or groups here
export const PROTEIN_TARGETS: Record<string, number> = {
  poultry: 0.65,
  fish: 0.20,
  "red-meat": 0.05,
  vegetarian: 0.10,
};

// Card accent colors by protein group key (used in planner view)
export const PROTEIN_COLORS: Record<string, string> = {
  poultry: "border-l-blue-400",
  fish: "border-l-cyan-400",
  "red-meat": "border-l-red-400",
  vegetarian: "border-l-green-400",
};