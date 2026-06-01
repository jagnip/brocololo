import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPublicShareForPlan,
  resolvePublicShare,
} from "./shopping-list-share";

vi.mock("./index", () => ({
  prisma: {
    shoppingListShare: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    shoppingList: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./index";

describe("resolvePublicShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for revoked share", async () => {
    vi.mocked(prisma.shoppingListShare.findUnique).mockResolvedValue({
      id: "share-1",
      shoppingListId: "list-1",
      token: "tok",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
      createdByUserId: "user-1",
      shoppingList: {
        plan: {
          id: "plan-1",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-04"),
        },
      },
    } as never);

    const result = await resolvePublicShare("tok");
    expect(result).toBeNull();
  });

  it("returns null for expired share", async () => {
    vi.mocked(prisma.shoppingListShare.findUnique).mockResolvedValue({
      id: "share-1",
      shoppingListId: "list-1",
      token: "tok",
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      createdAt: new Date(),
      createdByUserId: "user-1",
      shoppingList: {
        plan: {
          id: "plan-1",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-04"),
        },
      },
    } as never);

    const result = await resolvePublicShare("tok");
    expect(result).toBeNull();
  });

  it("returns plan scope for valid share", async () => {
    vi.mocked(prisma.shoppingListShare.findUnique).mockResolvedValue({
      id: "share-1",
      shoppingListId: "list-1",
      token: "tok",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      createdByUserId: "user-1",
      shoppingList: {
        plan: {
          id: "plan-1",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-04"),
        },
      },
    } as never);

    const result = await resolvePublicShare("tok");
    expect(result).toEqual({
      shareId: "share-1",
      shoppingListId: "list-1",
      planId: "plan-1",
      planStartDate: new Date("2026-06-01"),
      planEndDate: new Date("2026-06-04"),
    });
  });
});

describe("createPublicShareForPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list_empty when shopping list has no items", async () => {
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
      id: "list-1",
      _count: { items: 0 },
    } as never);

    const result = await createPublicShareForPlan("user-1", "plan-1");
    expect(result).toEqual({ ok: false, error: "list_empty" });
  });

  it("revokes prior shares and creates a new token", async () => {
    vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
      id: "list-1",
      _count: { items: 3 },
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        shoppingListShare: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockResolvedValue({
            id: "share-2",
            token: "new-token",
            expiresAt: new Date("2026-06-10"),
          }),
        },
      };
      return callback(tx as never);
    });

    const result = await createPublicShareForPlan("user-1", "plan-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token).toBe("new-token");
      expect(result.shareId).toBe("share-2");
    }
  });
});
