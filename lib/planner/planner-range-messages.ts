export function formatMealCountLabel(count: number): string {
  return count === 1 ? "1 meal" : `${count} meals`;
}

export function formatMovedMealsToast(movedCount: number): string | null {
  if (movedCount <= 0) {
    return null;
  }
  return movedCount === 1
    ? "Moved 1 meal to a new day."
    : `Moved ${movedCount} meals to new days.`;
}

export function formatRangeChangeDialogTitle(unallocatableCount: number): string {
  return unallocatableCount === 1
    ? "A meal cannot be kept in this range"
    : "Some meals cannot be kept in this range";
}

export function formatRangeChangeDialogDescription(params: {
  relocatedCount: number;
  unallocatableCount: number;
}): string {
  const { relocatedCount, unallocatableCount } = params;

  if (relocatedCount > 0) {
    const movedLabel = formatMealCountLabel(relocatedCount);
    if (unallocatableCount === 1) {
      return `We moved ${movedLabel} to open slots. 1 meal still does not fit and will be removed if you continue.`;
    }
    const remainingLabel = formatMealCountLabel(unallocatableCount);
    return `We moved ${movedLabel} to open slots. ${remainingLabel} still do not fit and will be removed if you continue.`;
  }

  if (unallocatableCount === 1) {
    return "1 meal does not fit in the new date range and will be removed if you continue.";
  }

  const remainingLabel = formatMealCountLabel(unallocatableCount);
  return `${remainingLabel} do not fit in the new date range and will be removed if you continue.`;
}
