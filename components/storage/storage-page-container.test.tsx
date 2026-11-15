import { describe, expect, it, vi } from "vitest";
import { ensureRollingQueueInitialized, listRollingMealQueue } from "@/lib/db/rolling-meals";
import { StoragePageContainer } from "./storage-page-container";

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("@/lib/db/family-members", () => ({ ensureSelfFamilyMember: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/storage", () => ({ listStoredMealLots: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db/rolling-meals", () => ({
  ensureRollingQueueInitialized: vi.fn().mockResolvedValue(undefined),
  listRollingMealQueue: vi.fn().mockResolvedValue([]),
}));
vi.mock("./storage-list", () => ({ StorageList: () => null }));
vi.mock("./rolling-meals-section", () => ({ RollingMealsSection: () => null }));

describe("StoragePageContainer", () => {
  it("initializes the queue before reading rolling meals", async () => {
    await StoragePageContainer();
    expect(ensureRollingQueueInitialized).toHaveBeenCalledWith("user");
    expect(listRollingMealQueue).toHaveBeenCalledWith("user");
    expect(vi.mocked(ensureRollingQueueInitialized).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(listRollingMealQueue).mock.invocationCallOrder[0]!);
  });
});
