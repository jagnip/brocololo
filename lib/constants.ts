import { PlannerMealType } from "@/src/generated/enums";

/** Product name shown in UI, metadata, and Clerk auth copy. */
export const APP_NAME = "Turniply";

export const MEAL_OCCASION_BREADCRUMB_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export const MEAL_TYPES: PlannerMealType[] = [
  PlannerMealType.BREAKFAST,
  PlannerMealType.LUNCH,
  PlannerMealType.DINNER,
];

export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  recipes: "/recipes",
  recipeCreate: "/recipes/create",
  recipe: (slug: string) => `/recipes/${slug}`,
  recipeEdit: (slug: string) => `/recipes/${slug}/edit`,
  ingredients: "/ingredients",
  ingredientCreate: "/ingredients/create",
  ingredientEdit: (slug: string) => `/ingredients/${slug}/edit`,
  /** URL prefix for planner routes; index redirects to /plan/current. */
  plan: "/plan",
  /** Left nav “Planner” — opens today’s plan (or latest), like Log → current log. */
  planCurrent: "/plan/current",
  planCreate: "/plan/create",
  planView: (planId: string) => `/plan/${planId}`,
  groceries: "/groceries",
  /** Left nav “Groceries” — opens today’s plan list (or latest), like Plan → current. */
  groceriesCurrent: "/groceries/current",
  groceriesView: (planId: string) => `/groceries/${planId}`,
  // Dedicated edit page for a persisted grocery list.
  groceriesEdit: (planId: string) => `/groceries/${planId}/edit`,
  shareGroceries: (token: string) => `/share/groceries/${token}`,
  /** URL prefix for log routes; there is no list page at this path (index redirects). */
  log: "/log",
  logCurrent: "/log/current",
  logView: (logId: string) => `/log/${logId}`,
  settings: "/settings",
} as const;

/** Server-side guard against abuse; not shown as a product limit in UI. */
export const FAMILY_MEMBERS_MAX_PER_USER = 100;


export type MealTimeLimits = {
  breakfastHandsOnMax: number | null;
  lunchHandsOnMax: number | null;
  dinnerHandsOnMax: number | null;
  breakfastTotalMax: number | null;
  lunchTotalMax: number | null;
  dinnerTotalMax: number | null;
};

// Shared grouped defaults for planner time limits (weekday hands-on: 30 min per meal).
export const WEEKDAY_TIME_LIMIT_DEFAULTS: MealTimeLimits = {
  breakfastHandsOnMax: 30,
  lunchHandsOnMax: 30,
  dinnerHandsOnMax: 30,
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

/** Recipe-card protein badge groups — every seeded protein maps to one of these. */
export const PROTEIN_BADGE_GROUPS = [
  "poultry",
  "fish",
  "red-meat",
  "vegetarian",
] as const;

export type ProteinBadgeGroup = (typeof PROTEIN_BADGE_GROUPS)[number];

// Add new protein slugs here so they always resolve to a badge group (never outline).
export const PROTEIN_GROUP_MAP: Record<string, ProteinBadgeGroup> = {
  beef: "red-meat",
  pork: "red-meat",
  eggs: "vegetarian",
  tofu: "vegetarian",
  dairy: "vegetarian",
  turkey: "poultry",
  chicken: "poultry",
  fish: "fish",
};

//Sum should be 1.0, add categories or groups here
export const PROTEIN_TARGETS: Record<string, number> = {
  poultry: 0.65,
  fish: 0.20,
  "red-meat": 0.05,
  vegetarian: 0.10,
};

// Recipe-card protein chip colors: --category-protein-* in globals.css + getProteinBadgeVariant().
// Portion split chart slices: --portion-chart-1..8 (dedicated viz palette; 9+ cycles).