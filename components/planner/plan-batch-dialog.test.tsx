import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlanBatchDialog } from "./plan-batch-dialog";

const familyMembers = [
  { id: "j", name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: "n", name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 1 },
];

const batch = {
  id: "batch-1",
  recipeId: "recipe-1",
  storageRows: [{ count: 2, cookingFamilyMemberIds: ["j", "n"] }],
  extraPortions: 0,
};

describe("PlanBatchDialog", () => {
  it("removes the batch immediately and closes without saving draft changes", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onSave = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        batch={batch}
        scheduledCombinations={[{ count: 2, memberIds: ["j"] }]}
        familyMembers={familyMembers}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove batch" }));

    expect(onRemove).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("groups scheduled meals read-only and saves editable storage", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        batch={batch}
        scheduledCombinations={[
          { count: 2, memberIds: ["j"] },
          { count: 1, memberIds: ["j", "n"] },
        ]}
        familyMembers={familyMembers}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("2 meals forJagoda");
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "1 meal forJagoda and Nelson",
    );
    expect(screen.getByRole("button", { name: "Save batch" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Increase extra portions" }));
    await user.click(screen.getByRole("button", { name: "Remove Nelson for combination 1" }));
    await user.click(screen.getByRole("button", { name: "Save batch" }));

    expect(onSave).toHaveBeenCalledWith({
      ...batch,
      storageRows: [{ count: 2, cookingFamilyMemberIds: ["j"] }],
      extraPortions: 1,
    });
  });

  it("supports zero storage rows and keeps cancel separate from save", async () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        batch={batch}
        scheduledCombinations={[{ count: 1, memberIds: ["j"] }]}
        familyMembers={familyMembers}
        onOpenChange={onOpenChange}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove meal combination 1" }));
    expect(screen.getByText("No meals in storage.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("prevents removing the final audience member", async () => {
    const user = userEvent.setup();
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        batch={batch}
        scheduledCombinations={[{ count: 1, memberIds: ["j"] }]}
        familyMembers={familyMembers}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove Jagoda for combination 1" }));
    await user.click(screen.getByRole("button", { name: "Remove Nelson for combination 1" }));

    expect(
      screen.getByRole("button", { name: "Remove Nelson for combination 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
