import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { GroceriesPlanSelect } from "./groceries-plan-select";

const pushMock = vi.hoisted(() => vi.fn());
const pathnameMock = vi.hoisted(() => vi.fn(() => "/groceries/plan-1"));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    usePathname: () => pathnameMock(),
    useSearchParams: () => new URLSearchParams("sort=name"),
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
      aria-label="groceries-plan-select"
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

describe("GroceriesPlanSelect", () => {
  it("navigates to groceries view and preserves query params", async () => {
    pathnameMock.mockReturnValue("/groceries/plan-1");
    const user = userEvent.setup();
    pushMock.mockClear();

    render(
      <GroceriesPlanSelect
        plans={[
          { id: "plan-1", label: "Jan 1 - Jan 7" },
          { id: "plan-2", label: "Jan 8 - Jan 14" },
        ]}
        currentPlanId="plan-1"
      />,
    );

    await user.selectOptions(screen.getByLabelText("groceries-plan-select"), "plan-2");

    expect(pushMock).toHaveBeenCalledWith("/groceries/plan-2?sort=name");
  });

  it("on edit route, navigates to groceries edit for the selected plan", async () => {
    pathnameMock.mockReturnValue("/groceries/plan-1/edit");
    const user = userEvent.setup();
    pushMock.mockClear();

    render(
      <GroceriesPlanSelect
        plans={[
          { id: "plan-1", label: "Jan 1 - Jan 7" },
          { id: "plan-2", label: "Jan 8 - Jan 14" },
        ]}
        currentPlanId="plan-1"
      />,
    );

    await user.selectOptions(screen.getByLabelText("groceries-plan-select"), "plan-2");

    expect(pushMock).toHaveBeenCalledWith("/groceries/plan-2/edit?sort=name");
  });

  it("does not navigate when selecting the current plan", async () => {
    pathnameMock.mockReturnValue("/groceries/plan-1");
    const user = userEvent.setup();
    pushMock.mockClear();

    render(
      <GroceriesPlanSelect
        plans={[
          { id: "plan-1", label: "Jan 1 - Jan 7" },
          { id: "plan-2", label: "Jan 8 - Jan 14" },
        ]}
        currentPlanId="plan-1"
      />,
    );

    await user.selectOptions(screen.getByLabelText("groceries-plan-select"), "plan-1");

    expect(pushMock).not.toHaveBeenCalled();
  });
});
