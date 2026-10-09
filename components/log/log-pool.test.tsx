import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogPool } from "./log-pool";

const viewport = vi.hoisted(() => ({ isMobile: true }));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => viewport.isMobile,
}));

describe("LogPool", () => {
  beforeEach(() => {
    viewport.isMobile = true;
  });

  it("starts collapsed on phones and can expand and collapse", async () => {
    const user = userEvent.setup();
    render(<LogPool items={[]} />);

    const trigger = screen.getByRole("button", { name: "Planned meals" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No planner meals left in pool.")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("No planner meals left in pool.")).toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No planner meals left in pool.")).not.toBeInTheDocument();
  });

  it("keeps planned meals expanded on larger screens", () => {
    viewport.isMobile = false;
    render(<LogPool items={[]} />);

    expect(screen.getByRole("heading", { name: "Planned meals" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Planned meals" })).not.toBeInTheDocument();
    expect(screen.getByText("No planner meals left in pool.")).toBeVisible();
  });

  it("keeps the phone collapsed state when resizing to desktop and back", () => {
    const view = render(<LogPool items={[]} />);

    viewport.isMobile = false;
    view.rerender(<LogPool items={[]} />);
    expect(screen.getByText("No planner meals left in pool.")).toBeVisible();

    viewport.isMobile = true;
    view.rerender(<LogPool items={[]} />);
    expect(screen.getByRole("button", { name: "Planned meals" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No planner meals left in pool.")).not.toBeInTheDocument();
  });
});
