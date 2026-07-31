/** Shared copy for add vs edit meal dialogs (single slot or bulk selection). */

export function getAddMealDialogCopy(slotSubtitle: string) {
  return {
    title: "Add meal",
    subtitle: slotSubtitle,
    saveLabel: "Save meal",
  } as const;
}

export function getEditMealDialogCopy(slotSubtitle: string) {
  return {
    title: "Edit meal",
    subtitle: slotSubtitle,
    saveLabel: "Save meal",
  } as const;
}

export function getBulkEditMealsDialogCopy(affectedSlotCount: number) {
  const slotLabel = affectedSlotCount === 1 ? "slot" : "slots";

  return {
    title: "Edit meals",
    subtitle: `${affectedSlotCount} ${slotLabel} selected`,
    saveLabel: "Save meals",
  } as const;
}

/** @deprecated Prefer getEditMealDialogCopy / getBulkEditMealsDialogCopy. */
export function getReplaceMealDialogCopy(affectedSlotCount: number) {
  return getBulkEditMealsDialogCopy(affectedSlotCount);
}

export function getMealChangeSummary(params: {
  fromName: string | null;
  toName: string | null;
}): string | null {
  const from = params.fromName?.trim() || null;
  const to = params.toName?.trim() || null;

  // Recipe / meal name only — audience-only edits intentionally show no footer summary.
  if (from && to && from !== to) {
    return `${from} → ${to}`;
  }

  if (!from && to) {
    return to;
  }

  return null;
}
