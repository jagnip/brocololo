import { describe, expect, it, vi } from "vitest";
import { updatePlan } from "./planner";
import { prisma } from "./index";
import { ensureRollingLifecycleTx, syncRollingPlanTx } from "./rolling-meals";

vi.mock("./rolling-meals", () => ({
  ensureRollingLifecycleTx: vi.fn(), syncRollingPlanTx: vi.fn(),
  reconcileRollingBatchRemaindersTx: vi.fn(async (_tx, _userId, _planId, batches) => batches),
  verifyRollingBatchAssignmentsTx: vi.fn(), deleteRollingPlanTx: vi.fn(),
}));

vi.mock("./index", () => ({ prisma: { $transaction: vi.fn() } }));

describe("plan version guard", () => {
  it("rejects missing and invalid versions before starting a transaction", async () => {
    for (const expectedVersion of [undefined, -1, 0.5, 2147483647]) {
      await expect(updatePlan("user", "plan", [], { expectedVersion })).rejects.toThrow("INVALID_PLAN_VERSION");
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns a conflict without reading or mutating slots when the claim fails", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn();
    const lock = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({ $queryRaw: lock, plan: { updateMany, findFirst } }),
    );
    await expect(updatePlan("user", "plan", [], { expectedVersion: 3 })).resolves.toEqual({ type: "version_conflict" });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "plan", userId: "user", version: 3 },
      data: { version: { increment: 1 } },
    });
    expect(findFirst).not.toHaveBeenCalled();
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ensureRollingLifecycleTx).mock.invocationCallOrder[0]!);
    expect(vi.mocked(ensureRollingLifecycleTx).mock.invocationCallOrder[0]).toBeLessThan(updateMany.mock.invocationCallOrder[0]!);
    expect(syncRollingPlanTx).not.toHaveBeenCalled();
  });
});
