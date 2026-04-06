import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanDetailPage } from "./plan-detail-page";

vi.mock("@/components/planner/plan-editor-container", () => ({
  PlanEditorContainer: ({ planId }: { planId: string }) => (
    <div data-testid="plan-editor">editor:{planId}</div>
  ),
}));

describe("PlanDetailPage", () => {
  it("renders the plan editor for the selected plan (top bar lives in layout)", async () => {
    render(await PlanDetailPage({ planId: "plan-1" }));

    expect(screen.getByTestId("plan-editor")).toHaveTextContent("editor:plan-1");
  });
});
