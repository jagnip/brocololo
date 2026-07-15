import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFamilyMember,
  deleteFamilyMember,
  listFamilyMembers,
  updateFamilyMemberName,
} from "@/lib/db/family-members";
import {
  createFamilyMemberAction,
  deleteFamilyMemberAction,
  updateFamilyMemberNameAction,
} from "./family-member-actions";

vi.mock("@/lib/db/family-members", () => ({
  listFamilyMembers: vi.fn(),
  updateFamilyMemberName: vi.fn(),
  createFamilyMember: vi.fn(),
  deleteFamilyMember: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: "user-test",
    clerkId: "clerk-test",
    email: null,
  }),
}));

const selfMember = {
  id: "fm-self",
  name: "",
  isSelf: true,
  sortOrder: 0,
  portionMultiplier: 1,
};

describe("updateFamilyMemberNameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows renaming self to empty string", async () => {
    vi.mocked(updateFamilyMemberName).mockResolvedValue(selfMember);

    const result = await updateFamilyMemberNameAction({
      id: selfMember.id,
      name: "   ",
    });

    expect(result.type).toBe("success");
    expect(updateFamilyMemberName).toHaveBeenCalledWith({
      userId: "user-test",
      id: selfMember.id,
      name: "",
    });
  });

  it("renames a member on success", async () => {
    vi.mocked(updateFamilyMemberName).mockResolvedValue({
      ...selfMember,
      name: "Jagoda",
    });

    const result = await updateFamilyMemberNameAction({
      id: selfMember.id,
      name: "Jagoda",
    });

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.member.name).toBe("Jagoda");
    }
    expect(updateFamilyMemberName).toHaveBeenCalledWith({
      userId: "user-test",
      id: selfMember.id,
      name: "Jagoda",
    });
  });

  it("allows renaming non-self to empty string", async () => {
    vi.mocked(updateFamilyMemberName).mockResolvedValue({
      id: "fm-2",
      name: "",
      isSelf: false,
      sortOrder: 1,
      portionMultiplier: 1,
    });

    const result = await updateFamilyMemberNameAction({
      id: "fm-2",
      name: "",
    });

    expect(result.type).toBe("success");
    expect(updateFamilyMemberName).toHaveBeenCalledWith({
      userId: "user-test",
      id: "fm-2",
      name: "",
    });
  });
});

describe("createFamilyMemberAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a family member with empty name", async () => {
    vi.mocked(listFamilyMembers).mockResolvedValue([selfMember]);
    vi.mocked(createFamilyMember).mockResolvedValue({
      id: "fm-2",
      name: "",
      isSelf: false,
      sortOrder: 1,
      portionMultiplier: 1,
    });

    const result = await createFamilyMemberAction({ name: "   " });

    expect(result.type).toBe("success");
    expect(createFamilyMember).toHaveBeenCalledWith({
      userId: "user-test",
      name: "",
    });
  });
});

describe("deleteFamilyMemberAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks deleting the self member", async () => {
    vi.mocked(deleteFamilyMember).mockRejectedValue(
      new Error("CANNOT_DELETE_SELF_MEMBER"),
    );

    const result = await deleteFamilyMemberAction({ id: selfMember.id });

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.message).toContain("cannot remove");
    }
  });

  it("deletes a non-self member", async () => {
    vi.mocked(deleteFamilyMember).mockResolvedValue(undefined);

    const result = await deleteFamilyMemberAction({ id: "fm-2" });

    expect(result.type).toBe("success");
    expect(deleteFamilyMember).toHaveBeenCalledWith({
      userId: "user-test",
      id: "fm-2",
    });
  });
});
