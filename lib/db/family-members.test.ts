import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFamilyMember } from "./family-members";

vi.mock("./index", () => ({
  prisma: {
    familyMember: { findFirst: vi.fn() },
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
