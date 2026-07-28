import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlannerBulkEditEatersDialog } from "./planner-bulk-edit-eaters-dialog";

describe("PlannerBulkEditEatersDialog", () => {
  it("starts with all family members selected and saves the updated selection", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <PlannerBulkEditEatersDialog
        open
        familyMembers={[
          { id: "fm-a", name: "Ada", isSelf: true },
          { id: "fm-b", name: "Ben", isSelf: false },
        ] as any}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("button", { name: "Ada" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Ben" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Ben" }));
    await user.click(screen.getByRole("button", { name: "Update eaters" }));

    expect(onSave).toHaveBeenCalledWith(["fm-a"]);
  });

  it("keeps one eater selected instead of allowing an empty state", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <PlannerBulkEditEatersDialog
        open
        familyMembers={[
          { id: "fm-a", name: "Ada", isSelf: true },
          { id: "fm-b", name: "Ben", isSelf: false },
        ] as any}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ben" }));
    await user.click(screen.getByRole("button", { name: "Ada" }));

    const submitButton = screen.getByRole("button", { name: "Update eaters" });
    expect(submitButton).toBeEnabled();
    expect(screen.getByRole("button", { name: "Ada" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(submitButton);
    expect(onSave).toHaveBeenCalledWith(["fm-a"]);
  });
});
