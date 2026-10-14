import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFamilyMember, getFamilyMemberRecipeImpact } from "./family-members";

vi.mock("./index", () => ({
  prisma: {
    familyMember: { findFirst: vi.fn() },
    recipeAudienceMember: { count: vi.fn() },
    recipeMemberPortion: { count: vi.fn() },
    recipeIngredientMemberTarget: { count: vi.fn() },
    recipeMemberPreference: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./index";

describe("deleteFamilyMember", () => {
  const storageRowFindMany = vi.fn();
  const storageRowDeleteMany = vi.fn();
  const familyMemberDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.familyMember.findFirst).mockResolvedValue({
      id: "member-2",
      isSelf: false,
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        planBatchStorageRow: {
          findMany: storageRowFindMany,
          deleteMany: storageRowDeleteMany,
        },
        familyMember: { delete: familyMemberDelete },
      }),
    );
    storageRowDeleteMany.mockResolvedValue({ count: 1 });
    familyMemberDelete.mockResolvedValue({});
  });

  it("deletes storage rows whose sole audience member is being deleted", async () => {
    storageRowFindMany.mockResolvedValue([
      { id: "sole-row", _count: { audienceMembers: 1 } },
      { id: "shared-row", _count: { audienceMembers: 2 } },
    ]);

    await deleteFamilyMember({ userId: "user-1", id: "member-2" });

    expect(storageRowDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["sole-row"] } },
    });
    expect(familyMemberDelete).toHaveBeenCalledWith({
      where: { id: "member-2" },
    });
  });
});

describe("getFamilyMemberRecipeImpact", () => {
  it.each([0, 1])("includes preference-only impact with %i rows", async (count) => {
    vi.mocked(prisma.familyMember.findFirst).mockResolvedValue({ id: "member-2" } as never);
    vi.mocked(prisma.recipeAudienceMember.count).mockResolvedValue(0);
    vi.mocked(prisma.recipeMemberPortion.count).mockResolvedValue(0);
    vi.mocked(prisma.recipeIngredientMemberTarget.count).mockResolvedValue(0);
    vi.mocked(prisma.recipeMemberPreference.count).mockResolvedValue(count);

    await expect(getFamilyMemberRecipeImpact({ userId: "user-1", id: "member-2" }))
      .resolves.toEqual({ hasRecipeImpact: count > 0 });
    expect(prisma.recipeMemberPreference.count).toHaveBeenCalledWith({
      where: { familyMemberId: "member-2", recipe: { userId: "user-1" } },
    });
  });
});
