import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlanSelect } from "./plan-select";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => new URLSearchParams("person=PRIMARY&day=2026-03-17"),
  };
});

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <select
      aria-label="plan-select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => children,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => children,
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: ReactNode;
  }) => <option value={value}>{children}</option>,
}));

describe("PlanSelect", () => {
  it("navigates to selected plan and preserves query params", async () => {
    const user = userEvent.setup();

    render(
      <PlanSelect
        plans={[
          { id: "plan-1", label: "Mar 1 - Mar 7" },
          { id: "plan-2", label: "Mar 8 - Mar 14" },
        ]}
        currentPlanId="plan-1"
      />,
    );

    await user.selectOptions(screen.getByLabelText("plan-select"), "plan-2");

    expect(pushMock).toHaveBeenCalledWith("/plan/plan-2?person=PRIMARY&day=2026-03-17");
  });

  it("does not navigate when selecting the current plan", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();

    render(
      <PlanSelect
        plans={[
          { id: "plan-1", label: "Mar 1 - Mar 7" },
          { id: "plan-2", label: "Mar 8 - Mar 14" },
        ]}
        currentPlanId="plan-1"
      />,
    );

    await user.selectOptions(screen.getByLabelText("plan-select"), "plan-1");

    expect(pushMock).not.toHaveBeenCalled();
  });
});
