import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUnit, getUnitById, renameUnit } from "@/lib/db/units";
import { requireUser } from "@/lib/auth/session";
import {
  createUnitInlineAction,
  renameUnitInlineAction,
} from "./unit-actions";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: "user-test",
    clerkId: "clerk-test",
    email: null,
    isAdmin: false,
  }),
}));

vi.mock("@/lib/db/units", () => ({
  createUnit: vi.fn(),
  getUnitById: vi.fn(),
  renameUnit: vi.fn(),
}));

function makeUnitRecord() {
  return {
    id: "unit-piece",
    name: "piece",
    namePlural: "pieces",
  };
}

describe("createUnitInlineAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({
      id: "user-test",
      clerkId: "clerk-test",
      email: null,
      isAdmin: false,
    });
  });

  it("rejects non-admin users before creating a unit", async () => {
    const result = await createUnitInlineAction({ name: "can" });

    expect(result).toEqual({
      type: "error",
      message: "You don't have permission to create units",
    });
    expect(createUnit).not.toHaveBeenCalled();
  });

  it("creates a unit when the user is an admin", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({
      id: "admin-test",
      clerkId: "clerk-admin",
      email: null,
      isAdmin: true,
    });
    vi.mocked(createUnit).mockResolvedValueOnce(makeUnitRecord());

    const result = await createUnitInlineAction({
      name: "piece",
      namePlural: "pieces",
    });

    expect(result).toEqual({
      type: "success",
      unit: makeUnitRecord(),
    });
    expect(createUnit).toHaveBeenCalledWith({
      name: "piece",
      namePlural: "pieces",
    });
  });
});

describe("renameUnitInlineAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({
      id: "user-test",
      clerkId: "clerk-test",
      email: null,
      isAdmin: false,
    });
  });

  it("rejects non-admin users before renaming a unit", async () => {
    const result = await renameUnitInlineAction({
      unitId: "unit-piece",
      name: "pieces",
    });

    expect(result).toEqual({
      type: "error",
      message: "You don't have permission to rename units",
    });
    expect(getUnitById).not.toHaveBeenCalled();
    expect(renameUnit).not.toHaveBeenCalled();
  });

  it("renames a unit when the user is an admin", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({
      id: "admin-test",
      clerkId: "clerk-admin",
      email: null,
      isAdmin: true,
    });
    vi.mocked(getUnitById).mockResolvedValueOnce(makeUnitRecord());
    vi.mocked(renameUnit).mockResolvedValueOnce({
      ...makeUnitRecord(),
      name: "pieces",
    });

    const result = await renameUnitInlineAction({
      unitId: "unit-piece",
      name: "pieces",
      namePlural: "pieces",
    });

    expect(result).toEqual({
      type: "success",
      unit: {
        ...makeUnitRecord(),
        name: "pieces",
      },
    });
    expect(renameUnit).toHaveBeenCalledWith({
      unitId: "unit-piece",
      name: "pieces",
      namePlural: "pieces",
    });
  });
});
