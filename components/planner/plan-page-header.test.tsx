import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanPageHeader } from "./plan-page-header";

vi.mock("./plan-select", () => ({
  PlanSelect: ({ currentPlanId }: { currentPlanId: string }) => (
    <div data-testid="plan-select">plan:{currentPlanId}</div>
  ),
}));

describe("PlanPageHeader", () => {
  it("renders plan selector and create button", () => {
    render(
      <PlanPageHeader
        planId="plan-1"
        planOptions={[
          { id: "plan-1", label: "Mar 1 - Mar 7" },
          { id: "plan-2", label: "Mar 8 - Mar 14" },
        ]}
      />,
    );

    expect(screen.getByTestId("plan-select")).toHaveTextContent("plan:plan-1");
    expect(screen.getByRole("link", { name: "New plan" })).toHaveAttribute("href", "/plan/create");
  });
});
