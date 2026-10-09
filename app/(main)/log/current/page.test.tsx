import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogCurrentPage from "./page";

const { getPlans, redirect } = vi.hoisted(() => ({
  getPlans: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/db/planner", () => ({ getPlans }));
vi.mock("@/components/planner/plan-current-empty", () => ({ PlanCurrentEmpty: () => null }));

const plan = {
  id: "plan-1",
  startDate: new Date("2026-10-09T00:00:00.000Z"),
  endDate: new Date("2026-10-15T00:00:00.000Z"),
  createdAt: new Date("2026-10-08T00:00:00.000Z"),
};

describe("Log current route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
    getPlans.mockResolvedValue([plan]);
  });

  afterEach(() => vi.useRealTimers());

  it("opens the current household plan in Log with the requested person and day", async () => {
    await expect(LogCurrentPage({ searchParams: Promise.resolve({ memberId: "member-2", day: "2026-10-11" }) }))
      .rejects.toThrow("REDIRECT:/log/plan/plan-1?day=2026-10-11&memberId=member-2");
    expect(getPlans).toHaveBeenCalledWith("user-1");
  });

  it("defaults to today inside the active plan", async () => {
    await expect(LogCurrentPage({ searchParams: Promise.resolve({}) }))
      .rejects.toThrow("REDIRECT:/log/plan/plan-1?day=2026-10-10");
  });

  it("renders a Log-specific empty state without redirecting when no plans exist", async () => {
    getPlans.mockResolvedValue([]);
    const result = await LogCurrentPage({ searchParams: Promise.resolve({}) });
    expect(result.props.emptyBreadcrumbContext).toBe("log");
    expect(redirect).not.toHaveBeenCalled();
  });
});
