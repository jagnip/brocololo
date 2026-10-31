import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlanDateRangeDialog } from "./plan-date-range-dialog";

describe("PlanDateRangeDialog calendar", () => {
  it("keeps the dialog open while selecting dates and applies them only on Save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <PlanDateRangeDialog
        open
        onOpenChange={onOpenChange}
        value={{ start: "2026-03-01", end: "2026-03-07" }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: /calendar/i }));
    await user.click(await screen.findByText("10", { exact: true }));
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(screen.getByText("12", { exact: true }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ start: "2026-03-10", end: "2026-03-12" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
