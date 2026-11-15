import { prisma } from "@/lib/db/index";
import type {
  AdjustStoredMealLotInput,
  RemoveStoredMealQuantityInput,
} from "@/lib/validations/storage";

export type StoredMealLotRow = {
  id: string;
  count: number;
  version: number;
  cookedAt: Date;
  recipe: {
    id: string;
    name: string;
    slug: string;
    archivedAt: Date | null;
    excludeFromPlanner: boolean;
  };
  audience: Array<{ id: string; name: string }>;
  sourcePlan: { id: string; startDate: Date; endDate: Date } | null;
};

const storedMealLotSelect = {
  id: true,
  count: true,
  version: true,
  cookedAt: true,
  recipe: {
    select: {
      id: true,
      name: true,
      slug: true,
      archivedAt: true,
      excludeFromPlanner: true,
    },
  },
  audienceMembers: {
    select: { familyMember: { select: { id: true, name: true } } },
  },
  sourcePlan: { select: { id: true, startDate: true, endDate: true } },
} as const;

function toStoredMealLotRow(lot: {
  id: string;
  count: number;
  version: number;
  cookedAt: Date;
  recipe: StoredMealLotRow["recipe"];
  audienceMembers: Array<{ familyMember: { id: string; name: string } }>;
  sourcePlan: StoredMealLotRow["sourcePlan"];
}): StoredMealLotRow {
  return {
    id: lot.id,
    count: lot.count,
    version: lot.version,
    cookedAt: lot.cookedAt,
    recipe: lot.recipe,
    audience: lot.audienceMembers.map((membership) => membership.familyMember),
    sourcePlan: lot.sourcePlan,
  };
}

export async function listStoredMealLots(userId: string): Promise<StoredMealLotRow[]> {
  const lots = await prisma.storedMealLot.findMany({
    where: { userId },
    orderBy: [{ cookedAt: "desc" }, { id: "desc" }],
    select: storedMealLotSelect,
  });
  return lots.map(toStoredMealLotRow);
}

async function assertOwnedAudience(
  userId: string,
  familyMemberIds: string[],
): Promise<boolean> {
  const count = await prisma.familyMember.count({
    where: { userId, id: { in: familyMemberIds } },
  });
  return count === familyMemberIds.length;
}

export async function adjustStoredMealLot(
  userId: string,
  input: AdjustStoredMealLotInput,
): Promise<
  | { type: "success"; lot: StoredMealLotRow | null }
  | { type: "not_found" | "conflict" | "invalid_audience" }
> {
  if (!(await assertOwnedAudience(userId, input.cookingFamilyMemberIds))) {
    return { type: "invalid_audience" };
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.storedMealLot.findFirst({
      where: { id: input.lotId, userId },
      select: { id: true, count: true, version: true, recipeId: true, recipe: { select: { name: true } } },
    });
    if (!existing) return { type: "not_found" as const };
    if (existing.version !== input.expectedVersion) return { type: "conflict" as const };

    if (input.count === 0) {
      const deleted = await tx.storedMealLot.deleteMany({
        where: { id: existing.id, userId, version: input.expectedVersion, count: existing.count },
      });
      if (deleted.count !== 1) return { type: "conflict" as const };
      await tx.storedMealEvent.create({
        data: {
          userId,
          recipeId: existing.recipeId,
          recipeName: existing.recipe.name,
          type: "ADJUSTED",
          quantity: existing.count,
          previousCount: existing.count,
          nextCount: 0,
        },
      });
      return { type: "success" as const, lot: null };
    }

    const changed = await tx.storedMealLot.updateMany({
      where: { id: existing.id, userId, version: input.expectedVersion },
      data: { count: input.count, version: { increment: 1 } },
    });
    if (changed.count !== 1) return { type: "conflict" as const };

    await tx.storedMealLotAudienceMember.deleteMany({ where: { lotId: existing.id } });
    await tx.storedMealLotAudienceMember.createMany({
      data: input.cookingFamilyMemberIds.map((familyMemberId) => ({
        lotId: existing.id,
        familyMemberId,
      })),
    });
    await tx.storedMealEvent.create({
      data: {
        userId,
        lotId: existing.id,
        recipeId: existing.recipeId,
        recipeName: existing.recipe.name,
        type: "ADJUSTED",
        quantity: Math.abs(input.count - existing.count) || input.count,
        previousCount: existing.count,
        nextCount: input.count,
      },
    });
    const lot = await tx.storedMealLot.findUniqueOrThrow({
      where: { id: existing.id },
      select: storedMealLotSelect,
    });
    return { type: "success" as const, lot: toStoredMealLotRow(lot) };
  });
}

export async function removeStoredMealQuantity(
  userId: string,
  input: RemoveStoredMealQuantityInput,
): Promise<
  | { type: "success"; lot: StoredMealLotRow | null }
  | { type: "not_found" | "conflict" }
> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.storedMealLot.findFirst({
      where: { id: input.lotId, userId },
      select: { id: true, count: true, version: true, recipeId: true, recipe: { select: { name: true } } },
    });
    if (!existing) return { type: "not_found" as const };
    if (existing.version !== input.expectedVersion || existing.count < input.quantity) {
      return { type: "conflict" as const };
    }

    const nextCount = existing.count - input.quantity;
    if (nextCount === 0) {
      const deleted = await tx.storedMealLot.deleteMany({
        where: {
          id: existing.id,
          userId,
          version: input.expectedVersion,
          count: existing.count,
        },
      });
      if (deleted.count !== 1) return { type: "conflict" as const };
      await tx.storedMealEvent.create({
        data: {
          userId,
          recipeId: existing.recipeId,
          recipeName: existing.recipe.name,
          type: input.reason,
          quantity: input.quantity,
          previousCount: existing.count,
          nextCount,
        },
      });
      return { type: "success" as const, lot: null };
    }

    const changed = await tx.storedMealLot.updateMany({
      where: {
        id: existing.id,
        userId,
        version: input.expectedVersion,
        count: { gte: input.quantity },
      },
      data: { count: { decrement: input.quantity }, version: { increment: 1 } },
    });
    if (changed.count !== 1) return { type: "conflict" as const };
    await tx.storedMealEvent.create({
      data: {
        userId,
        lotId: existing.id,
        recipeId: existing.recipeId,
        recipeName: existing.recipe.name,
        type: input.reason,
        quantity: input.quantity,
        previousCount: existing.count,
        nextCount,
      },
    });
    const lot = await tx.storedMealLot.findUniqueOrThrow({
      where: { id: existing.id },
      select: storedMealLotSelect,
    });
    return { type: "success" as const, lot: toStoredMealLotRow(lot) };
  });
}
