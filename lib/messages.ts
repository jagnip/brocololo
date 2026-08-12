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
    generated: "Empty meals filled",
    generatePending: "Thinking...",
    saved: "Plan saved",
    savePending: "Saving plan...",
    nothingToFill: "All meals are already filled",
    nothingToSave: "Add at least one meal before saving",
    nothingToClear: "Nothing to clear",
    cleared: "Meals cleared",
    fillInProgress: "Wait for suggestions to finish",
    planColumnIdleTitle: "Nothing planned yet",
    planColumnIdleSubtitle: "Suggest meals or add them yourself",
    generationFailedTitle: "We couldn't find recipes for your criteria",
    generationFailedSubtitle: "Please try to adjust your settings.",
    /** Toast when generatePlan cannot fill the plan. */
    generationFailedMessage: "We couldn't find recipes for your criteria",
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
