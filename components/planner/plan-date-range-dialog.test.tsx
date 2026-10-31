import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlanDateRangeDialog } from "./plan-date-range-dialog";

describe("PlanDateRangeDialog", () => {
  it.each(["pointer", "keyboard"])(
    "applies a range selected by %s on Save and closes",
    async (interaction) => {
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

      const dialog = screen.getByRole("dialog", { name: "Edit dates" });
      await user.click(within(dialog).getByRole("button", { name: /calendar/i }));
      // React Aria also renders a second Next button for touch screen readers.
      await user.click(within(dialog).getAllByRole("button", { name: "Next" })[0]);
      await user.click(within(dialog).getByRole("button", { name: /previous/i }));
      const start = within(dialog).getByRole("button", { name: /March 10, 2026/ });
      await user.click(start);
      expect(start).toHaveFocus();
      if (interaction === "keyboard") {
        await user.keyboard(
          "{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}",
        );
      } else {
        await user.click(
          within(dialog).getByRole("button", { name: /March 14, 2026/ }),
        );
      }
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(onSave).toHaveBeenCalledWith({
        start: "2026-03-10",
        end: "2026-03-14",
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    },
  );
});
