export const MESSAGES = {
  recipe: {
    created: "Recipe created",
    updated: "Recipe updated",
    creating: "Creating recipe...",
    updating: "Updating recipe...",
  },
  ingredient: {
    created: "Ingredient created",
    updated: "Ingredient updated",
    creating: "Creating ingredient...",
    updating: "Updating ingredient...",
  },
  planner: {
    generated: "Plan generated",
    generatePending: "Generating meals...",
    saved: "Plan saved",
    savePending: "Saving plan...",
  },
} as const;

export const REDIRECT_TOAST_QUERY_PARAM = "toast";

export const REDIRECT_TOAST_MESSAGES = {
  recipeCreated: MESSAGES.recipe.created,
  recipeUpdated: MESSAGES.recipe.updated,
  ingredientCreated: MESSAGES.ingredient.created,
  ingredientUpdated: MESSAGES.ingredient.updated,
} as const;

export type RedirectToastCode = keyof typeof REDIRECT_TOAST_MESSAGES;

export function isRedirectToastCode(value: string): value is RedirectToastCode {
  return Object.hasOwn(REDIRECT_TOAST_MESSAGES, value);
}

export function getRedirectToastMessage(value: string) {
  if (!isRedirectToastCode(value)) {
    return null;
  }
  return REDIRECT_TOAST_MESSAGES[value];
}

export function appendRedirectToastToPath(path: string, code: RedirectToastCode) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${REDIRECT_TOAST_QUERY_PARAM}=${code}`;
}
