export type StoredMealAllocationLot = {
  id: string;
  count: number;
  cookedAt: Date;
  cookingFamilyMemberIds: readonly string[];
};

export type StoredMealPlacement = {
  cookingFamilyMemberIds: readonly string[];
};

/** Returns a lot ID or null for each placement, in input order. Lot IDs must be unique. */
export function allocateStoredMeals(
  lots: readonly StoredMealAllocationLot[],
  placements: readonly StoredMealPlacement[],
): (string | null)[] {
  if (new Set(lots.map((lot) => lot.id)).size !== lots.length) {
    throw new Error("Stored meal lot IDs must be unique");
  }

  const audienceKey = (ids: readonly string[]) => JSON.stringify([...new Set(ids)].sort());
  const available = lots.map((lot) => ({
    ...lot,
    remaining: Number.isFinite(lot.count) ? Math.max(0, Math.floor(lot.count)) : 0,
    audienceKey: audienceKey(lot.cookingFamilyMemberIds),
  })).sort((a, b) => a.cookedAt.getTime() - b.cookedAt.getTime() ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const result: (string | null)[] = placements.map(() => null);

  for (const [index, placement] of placements.entries()) {
    const key = audienceKey(placement.cookingFamilyMemberIds);
    const lot = available.find((candidate) => candidate.remaining > 0 && candidate.audienceKey === key);
    if (lot) {
      result[index] = lot.id;
      lot.remaining--;
    }
  }

  for (const [index] of placements.entries()) {
    if (result[index] !== null) continue;
    const lot = available.find((candidate) => candidate.remaining > 0);
    if (!lot) break;
    result[index] = lot.id;
    lot.remaining--;
  }

  return result;
}
