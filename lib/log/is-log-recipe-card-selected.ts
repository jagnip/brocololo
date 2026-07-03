import type { LogRecipeCardData, LogSlotData } from "@/lib/log/view-model";
import { mealOptionIdFromRecipeCard } from "@/lib/log/meal-selector-options";

/** Mirrors `SelectedSlotState` fields needed to highlight the active log recipe card. */
export type LogEditorSlotForHighlight = {
  dayKey: string;
  mealType: LogSlotData["mealType"];
  entryRecipeId: string | null;
  selectedMealOptionId: string | null;
};

/**
 * Whether this card is the one whose ingredients are shown in the log editor.
 * Matches recipe-page instruction rows: selection is per slot + recipe identity.
 */
export function isLogRecipeCardSelected(
  editorSlot: LogEditorSlotForHighlight | null,
  dayKey: string,
  slot: LogSlotData,
  recipe: LogRecipeCardData,
): boolean {
  if (
    !editorSlot ||
    editorSlot.dayKey !== dayKey ||
    editorSlot.mealType !== slot.mealType
  ) {
    return false;
  }

  const recipeMealOptionId = mealOptionIdFromRecipeCard({
    sourceRecipeId: recipe.sourceRecipeId,
    planIdeaCustomName: recipe.planIdeaCustomName,
  });

  if (editorSlot.selectedMealOptionId !== recipeMealOptionId) {
    return false;
  }

  // Custom vs removed both use null meal option — disambiguate with entry recipe row id.
  if (editorSlot.selectedMealOptionId == null && recipeMealOptionId == null) {
    return editorSlot.entryRecipeId === recipe.entryRecipeId;
  }

  return true;
}
