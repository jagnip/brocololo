import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db/index";

const SHARE_TTL_DAYS = 7;

export type ResolvedPublicShare = {
  shareId: string;
  shoppingListId: string;
  planId: string;
  planStartDate: Date;
  planEndDate: Date;
};

export type ActiveShoppingListShare = {
  id: string;
  token: string;
  expiresAt: Date;
};

function isShareActive(expiresAt: Date, revokedAt: Date | null) {
  return revokedAt == null && expiresAt > new Date();
}

/** Validates a public share token and returns list/plan scope for guest access. */
export async function resolvePublicShare(
  token: string,
): Promise<ResolvedPublicShare | null> {
  const row = await prisma.shoppingListShare.findUnique({
    where: { token },
    include: {
      shoppingList: {
        include: {
          plan: {
            select: { id: true, startDate: true, endDate: true },
          },
        },
      },
    },
  });

  if (!row || !isShareActive(row.expiresAt, row.revokedAt)) {
    return null;
  }

  return {
    shareId: row.id,
    shoppingListId: row.shoppingListId,
    planId: row.shoppingList.plan.id,
    planStartDate: row.shoppingList.plan.startDate,
    planEndDate: row.shoppingList.plan.endDate,
  };
}

async function getOwnedShoppingListForPlan(userId: string, planId: string) {
  return prisma.shoppingList.findFirst({
    where: {
      planId,
      plan: { userId },
    },
    select: {
      id: true,
      _count: { select: { items: true } },
    },
  });
}

/** Owner-only: non-revoked share that is still valid, if any. */
export async function getActiveShareForPlan(
  userId: string,
  planId: string,
): Promise<ActiveShoppingListShare | null> {
  const list = await getOwnedShoppingListForPlan(userId, planId);
  if (!list) {
    return null;
  }

  const share = await prisma.shoppingListShare.findFirst({
    where: {
      shoppingListId: list.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, expiresAt: true },
  });

  return share;
}

export type CreatePublicShareResult =
  | {
      ok: true;
      token: string;
      expiresAt: Date;
      shareId: string;
    }
  | { ok: false; error: "plan_not_found" | "list_empty" };

/**
 * Creates a new 7-day public link for the plan's shopping list.
 * Revokes any previous active share for the same list (one active link).
 */
export async function createPublicShareForPlan(
  userId: string,
  planId: string,
): Promise<CreatePublicShareResult> {
  const list = await getOwnedShoppingListForPlan(userId, planId);
  if (!list) {
    return { ok: false, error: "plan_not_found" };
  }
  if (list._count.items === 0) {
    return { ok: false, error: "list_empty" };
  }

  const expiresAt = addDays(new Date(), SHARE_TTL_DAYS);
  const token = randomBytes(32).toString("base64url");

  const share = await prisma.$transaction(async (tx) => {
    await tx.shoppingListShare.updateMany({
      where: {
        shoppingListId: list.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return tx.shoppingListShare.create({
      data: {
        shoppingListId: list.id,
        token,
        expiresAt,
        createdByUserId: userId,
      },
      select: { id: true, token: true, expiresAt: true },
    });
  });

  return {
    ok: true,
    token: share.token,
    expiresAt: share.expiresAt,
    shareId: share.id,
  };
}

export async function revokeActiveShareForPlan(
  userId: string,
  planId: string,
): Promise<boolean> {
  const list = await getOwnedShoppingListForPlan(userId, planId);
  if (!list) {
    return false;
  }

  const result = await prisma.shoppingListShare.updateMany({
    where: {
      shoppingListId: list.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return result.count > 0;
}
