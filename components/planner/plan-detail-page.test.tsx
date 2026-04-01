import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanDetailPage } from "./plan-detail-page";

vi.mock("@/lib/db/planner", () => ({
  getPlans: vi.fn(),
}));

vi.mock("./plan-page-header", () => ({
  PlanPageHeader: ({
    planId,
    planOptions,
  }: {
    planId: string;
    planOptions: Array<{ id: string; label: string }>;
  }) => (
    <div data-testid="plan-header">
      {planId}:{planOptions.map((option) => `${option.id}-${option.label}`).join("|")}
    </div>
  ),
}));

vi.mock("@/components/planner/plan-editor-container", () => ({
  PlanEditorContainer: ({ planId }: { planId: string }) => (
    <div data-testid="plan-editor">editor:{planId}</div>
  ),
}));

describe("PlanDetailPage", () => {
  it("loads plans and passes header options plus selected plan id", async () => {
    const { getPlans } = await import("@/lib/db/planner");
    vi.mocked(getPlans).mockResolvedValue([
      {
        id: "plan-1",
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-07T00:00:00.000Z"),
      },
    ] as never);

    render(await PlanDetailPage({ planId: "plan-1" }));

    expect(screen.getByTestId("plan-header")).toHaveTextContent("plan-1:plan-1-Mar 1 - Mar 7");
    expect(screen.getByTestId("plan-editor")).toHaveTextContent("editor:plan-1");
  });
});
