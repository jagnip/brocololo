import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlanDateRangeDialog } from "./plan-date-range-dialog";

vi.mock("./date-range-picker", () => ({
  WeekPicker: ({
    value,
    onChange,
  }: {
    value: { start: string; end: string };
    onChange: (next: { start: string; end: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ start: "2026-04-01", end: "2026-04-07" })}
    >
      Change draft range
    </button>
  ),
}));

describe("PlanDateRangeDialog", () => {
  it("applies draft range on Save and closes", async () => {
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

    await user.click(screen.getByRole("button", { name: "Change draft range" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({
      start: "2026-04-01",
      end: "2026-04-07",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
