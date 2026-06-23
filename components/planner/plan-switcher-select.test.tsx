import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlanSwitcherSelect } from "./plan-switcher-select";

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
      aria-label="plan-switcher-select"
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

const planOptions = [
  { id: "plan-1", label: "Mar 1 - Mar 7" },
  { id: "plan-2", label: "Mar 8 - Mar 14" },
];

describe("PlanSwitcherSelect", () => {
  it("kind=plan navigates to selected plan and preserves query params", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();

    render(
      <PlanSwitcherSelect
        variant="default"
        kind="plan"
        options={planOptions}
        currentId="plan-1"
        ariaLabel="Switch meal plan"
      />,
    );

    await user.selectOptions(screen.getByLabelText("plan-switcher-select"), "plan-2");

    expect(pushMock).toHaveBeenCalledWith("/plan/plan-2?person=PRIMARY&day=2026-03-17");
  });

  it("kind=groceries navigates to groceries view and preserves query params", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();

    render(
      <PlanSwitcherSelect
        variant="default"
        kind="groceries"
        options={planOptions}
        currentId="plan-1"
        ariaLabel="Switch groceries list"
      />,
    );

    await user.selectOptions(screen.getByLabelText("plan-switcher-select"), "plan-2");

    expect(pushMock).toHaveBeenCalledWith("/groceries/plan-2?person=PRIMARY&day=2026-03-17");
  });

  it("does not navigate when selecting the current plan", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();

    render(
      <PlanSwitcherSelect
        variant="default"
        kind="plan"
        options={planOptions}
        currentId="plan-1"
        ariaLabel="Switch meal plan"
      />,
    );

    await user.selectOptions(screen.getByLabelText("plan-switcher-select"), "plan-1");

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("breadcrumb variant with one option renders static text", () => {
    render(
      <PlanSwitcherSelect
        variant="breadcrumb"
        kind="plan"
        label="Mar 1 - Mar 7"
        options={[{ id: "plan-1", label: "Mar 1 - Mar 7" }]}
        currentId="plan-1"
        ariaLabel="Switch meal plan"
      />,
    );

    expect(screen.getByText("Mar 1 - Mar 7")).toBeInTheDocument();
    expect(screen.queryByLabelText("plan-switcher-select")).not.toBeInTheDocument();
  });

  it("default variant with one option renders nothing", () => {
    const { container } = render(
      <PlanSwitcherSelect
        variant="default"
        kind="plan"
        options={[{ id: "plan-1", label: "Mar 1 - Mar 7" }]}
        currentId="plan-1"
        ariaLabel="Switch meal plan"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
