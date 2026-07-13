/**
 * Resolves a base recipe ingredient row for a specific family member.
 * Base row = default batch; MODIFY = per-person override; SKIP = excluded.
 */

export type RecipeIngredientAdjustmentKind = "MODIFY" | "SKIP";

export type MemberAdjustmentRow = {
  familyMemberId: string;
  kind: RecipeIngredientAdjustmentKind;
  ingredientId?: string | null;
  amount?: number | null;
  unitId?: string | null;
  additionalInfo?: string | null;
};

export type BaseIngredientRow = {
  id: string;
  ingredientId: string;
  amount: number | null;
  unitId: string | null;
  additionalInfo: string | null;
  memberAdjustments: MemberAdjustmentRow[];
};

export type ResolvedIngredientLine = {
  recipeIngredientId: string;
  familyMemberId: string;
  kind: "default" | "modify" | "skipped";
  ingredientId: string | null;
  /** Per-person amount when kind is modify; batch amount when default. */
  amount: number | null;
  batchAmount: number | null;
  unitId: string | null;
  additionalInfo: string | null;
};

/** Maps SKIP adjustments to legacy exclusive targeting for portion math. */
export function derivePortionTargetingFromAdjustments(
  memberAdjustments: Pick<MemberAdjustmentRow, "familyMemberId" | "kind">[],
  audienceMemberIds: string[],
): { appliesToEveryone: boolean; targetFamilyMemberIds: string[] } {
  const skipIds = memberAdjustments
    .filter((adjustment) => adjustment.kind === "SKIP")
    .map((adjustment) => adjustment.familyMemberId);

  if (skipIds.length === 0) {
    return { appliesToEveryone: true, targetFamilyMemberIds: [] };
  }

  return {
    appliesToEveryone: false,
    targetFamilyMemberIds: audienceMemberIds.filter((id) => !skipIds.includes(id)),
  };
}

/** Resolves one ingredient line for a member; returns null when skipped. */
export function resolveIngredientLineForMember(
  row: BaseIngredientRow,
  familyMemberId: string,
): ResolvedIngredientLine | null {
  const adjustment = row.memberAdjustments.find(
    (entry) => entry.familyMemberId === familyMemberId,
  );

  if (adjustment?.kind === "SKIP") {
    return null;
  }

  if (adjustment?.kind === "MODIFY") {
    return {
      recipeIngredientId: row.id,
      familyMemberId,
      kind: "modify",
      ingredientId: adjustment.ingredientId ?? row.ingredientId,
      amount: adjustment.amount ?? null,
      batchAmount: row.amount,
      unitId: adjustment.unitId ?? row.unitId,
      additionalInfo: adjustment.additionalInfo ?? row.additionalInfo,
    };
  }

  return {
    recipeIngredientId: row.id,
    familyMemberId,
    kind: "default",
    ingredientId: row.ingredientId,
    amount: row.amount,
    batchAmount: row.amount,
    unitId: row.unitId,
    additionalInfo: row.additionalInfo,
  };
}

/** Guest / neutral filter: null member id sees the base row unchanged. */
export function resolveIngredientLineForViewer(
  row: BaseIngredientRow,
  familyMemberId: string | null,
): ResolvedIngredientLine | null {
  if (familyMemberId == null) {
    return {
      recipeIngredientId: row.id,
      familyMemberId: "",
      kind: "default",
      ingredientId: row.ingredientId,
      amount: row.amount,
      batchAmount: row.amount,
      unitId: row.unitId,
      additionalInfo: row.additionalInfo,
    };
  }

  return resolveIngredientLineForMember(row, familyMemberId);
}

/** Whether an instruction-linked ingredient should appear for the person filter. */
export function isResolvedLineVisibleForPerson(
  row: Pick<BaseIngredientRow, "memberAdjustments">,
  familyMemberId: string | null,
): boolean {
  if (familyMemberId == null) {
    return true;
  }

  const adjustment = row.memberAdjustments.find(
    (entry) => entry.familyMemberId === familyMemberId,
  );
  return adjustment?.kind !== "SKIP";
}
