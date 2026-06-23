/** Reorder category ids by moving one id to a target index (shared by layout dialog and edit badges). */
export function moveCategoryIdToIndex(input: {
  categoryIds: string[];
  movedCategoryId: string;
  targetIndex: number;
}) {
  const sourceIndex = input.categoryIds.indexOf(input.movedCategoryId);
  if (sourceIndex < 0) return input.categoryIds;
  const next = [...input.categoryIds];
  const [moved] = next.splice(sourceIndex, 1);
  const boundedTarget = Math.max(0, Math.min(input.targetIndex, next.length));
  next.splice(boundedTarget, 0, moved);
  return next;
}
