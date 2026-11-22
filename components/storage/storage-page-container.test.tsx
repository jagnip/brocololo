import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { listRollingMealQueue } from "@/lib/db/rolling-meals";
import { StoragePageContainer } from "./storage-page-container";

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("@/lib/db/family-members", () => ({ ensureSelfFamilyMember: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/storage", () => ({ listStoredMealLots: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/rolling-meals", () => ({
  listRollingMealQueue: vi.fn().mockResolvedValue([]),
}));
vi.mock("./storage-list", () => ({ StorageList: () => null }));
vi.mock("./rolling-meals-section", () => ({ RollingMealsSection: () => null }));

describe("StoragePageContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listRollingMealQueue).mockResolvedValue([]);
  });

  it("reads eligible meals without initializing or capturing the queue", async () => {
    await StoragePageContainer();
    expect(listRollingMealQueue).toHaveBeenCalledExactlyOnceWith("user");
  });

  it("renders an actionable migration message instead of an empty queue", async () => {
    vi.mocked(listRollingMealQueue).mockRejectedValueOnce(Object.assign(new Error("Migration needed"), { code: "ROLLING_MIGRATION_REQUIRED" }));
    render(await StoragePageContainer());
    expect(screen.getByRole("alert")).toHaveTextContent("Rolling meals need migration");
    expect(screen.getByRole("alert")).toHaveTextContent("Contact support, then reload this page.");
    expect(listRollingMealQueue).toHaveBeenCalledExactlyOnceWith("user");
  });

  it("does not hide unrelated repository failures", async () => {
    vi.mocked(listRollingMealQueue).mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(StoragePageContainer()).rejects.toThrow("Database unavailable");
  });
});
