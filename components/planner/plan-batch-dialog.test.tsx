import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlanBatchDialog } from "./plan-batch-dialog";

const familyMembers = [
  { id: "j", name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
];

describe("PlanBatchDialog", () => {
  it("saves storage edits for an uncooked batch", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const batch = { id: "batch-1", recipeId: "recipe-1", storageRows: [], extraPortions: 0 };
    render(<PlanBatchDialog
      open recipeName="Bolognese" batch={batch} onSave={onSave}
      scheduledCombinations={[{ count: 2, memberIds: ["j"] }]}
      familyMembers={familyMembers} onOpenChange={vi.fn()}
    />);
    await user.click(screen.getByRole("button", { name: "Add storage meals" }));
    await user.click(screen.getByRole("button", { name: "Save batch" }));
    expect(onSave).toHaveBeenCalledWith({ ...batch, storageRows: [{ count: 1, cookingFamilyMemberIds: ["j"] }] });
  });

  it.each([true, false])("offers storage only for uncooked batches (%s)", (alreadyCooked) => {
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        alreadyCooked={alreadyCooked}
        batch={{ id: "batch-1", recipeId: "recipe-1", storageRows: [], extraPortions: 0 }}
        onSave={vi.fn()}
        scheduledCombinations={[{ count: 2, memberIds: ["j"] }]}
        familyMembers={familyMembers}
        onOpenChange={vi.fn()}
      />,
    );
    if (alreadyCooked) {
      expect(screen.queryByRole("heading", { name: "Storage" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Save batch" })).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole("heading", { name: "Storage" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add storage meals" })).toBeInTheDocument();
    }
  });

  it.each([true, false])("identifies cooked batches in the recipe subtitle (%s)", (alreadyCooked) => {
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        alreadyCooked={alreadyCooked}
        scheduledCombinations={[{ count: 2, memberIds: ["j"] }]}
        familyMembers={familyMembers}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(alreadyCooked ? "Bolognese \u00b7 Already cooked" : "Bolognese")).toBeInTheDocument();
    if (!alreadyCooked) expect(screen.queryByText(/Already cooked/)).not.toBeInTheDocument();
  });

  it("shows only scheduled meals and removes the entire batch", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        scheduledCombinations={[{ count: 2, memberIds: ["j"] }]}
        familyMembers={familyMembers}
        onOpenChange={onOpenChange}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Edit batch" })).toHaveTextContent("2 meals forJagoda");
    expect(screen.queryByText("Storage")).not.toBeInTheDocument();
    expect(screen.queryByText("extra portions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save batch" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove batch" }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without removing meals", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <PlanBatchDialog
        open
        recipeName="Bolognese"
        scheduledCombinations={[{ count: 1, memberIds: ["j"] }]}
        familyMembers={familyMembers}
        onOpenChange={onOpenChange}
        onRemove={onRemove}
      />,
    );
    await user.click(screen.getAllByRole("button", { name: /^Close$/ })[0]);
    expect(onRemove).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
