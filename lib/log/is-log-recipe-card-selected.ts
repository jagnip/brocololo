import type { LogRecipeCardData, LogSlotData } from "@/lib/log/view-model";

/** Mirrors `SelectedSlotState` fields needed to highlight the active log recipe card. */
export type LogEditorSlotForHighlight = {
  dayKey: string;
  mealType: LogSlotData["mealType"];
  entryRecipeId: string | null;
  selectedRecipeId: string | null;
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

  if (editorSlot.selectedRecipeId !== recipe.sourceRecipeId) {
    return false;
  }

  // Custom vs removed both use null sourceRecipeId — disambiguate with entry recipe row id.
  if (editorSlot.selectedRecipeId == null && recipe.sourceRecipeId == null) {
    return editorSlot.entryRecipeId === recipe.entryRecipeId;
  }

  return true;
}
