import { describe, expect, it, vi } from "vitest";
import PlanPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));
vi.mock("@/components/planner/planner-log-combined-page", () => ({
  PlannerLogCombinedPage: () => null,
}));

describe("legacy plan tracking URLs", () => {
  it("redirects the old tracking tab into Log while preserving person and day", async () => {
    await expect(PlanPage({
      params: Promise.resolve({ planId: "plan-1" }),
      searchParams: Promise.resolve({ tab: "log", memberId: "member-2", day: "2026-10-11" }),
    })).rejects.toThrow("REDIRECT:/log/plan/plan-1?memberId=member-2&day=2026-10-11");
  });

  it("keeps ordinary plan URLs on the planning surface", async () => {
    const result = await PlanPage({
      params: Promise.resolve({ planId: "plan-1" }),
      searchParams: Promise.resolve({}),
    });
    expect(result.props.children.props.tab).toBe("plan");
  });
});
