import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adjustStoredMealLotAction, removeStoredMealQuantityAction } from "@/actions/storage-actions";
import { StorageList } from "./storage-list";

vi.mock("@/actions/storage-actions", () => ({
  adjustStoredMealLotAction: vi.fn(),
  removeStoredMealQuantityAction: vi.fn(),
}));

const member = { id: "member-1", name: "Alex", isSelf: true, sortOrder: 0, portionMultiplier: 1 };
const lot = {
  id: "lot-1",
  count: 3,
  version: 2,
  cookedAt: new Date("2026-11-14T12:00:00Z"),
  recipe: { id: "recipe-1", name: "Soup", slug: "soup", archivedAt: null, excludeFromPlanner: false },
  audience: [{ id: member.id, name: member.name }],
  sourcePlan: null,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("StorageList", () => {
  it("renders an independent empty cooked section", () => {
    render(<StorageList lots={[]} familyMembers={[member]} />);
    expect(screen.getByRole("region", { name: "Cooked and stored" })).toHaveTextContent("No cooked meals in storage.");
  });

  it("offers direct Adjust and Discard actions with concise metadata", () => {
    render(<StorageList lots={[lot]} familyMembers={[member]} />);

    expect(screen.getByRole("button", { name: "Adjust Soup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard Soup" })).toBeInTheDocument();
    expect(screen.getByText("3 meals · 14 Nov · for Alex")).toBeInTheDocument();
  });

  it("uses Adjust wording and saves zero available meals", async () => {
    const user = userEvent.setup();
    vi.mocked(adjustStoredMealLotAction).mockResolvedValue({ type: "success", lot: null });
    render(<StorageList lots={[lot]} familyMembers={[member]} />);

    await user.click(screen.getByRole("button", { name: "Adjust Soup" }));
    const dialog = await screen.findByRole("dialog", { name: "Adjust Soup" });
    expect(within(dialog).getByText("Adjust the number of cooked meals and who they are for.")).toBeInTheDocument();
    const input = within(dialog).getByRole("spinbutton", { name: "Meals available" });
    await user.clear(input);
    await user.type(input, "0");
    const save = within(dialog).getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => expect(adjustStoredMealLotAction).toHaveBeenCalledWith({
      lotId: "lot-1",
      expectedVersion: 2,
      count: 0,
      cookingFamilyMemberIds: ["member-1"],
    }));
  });

  it("discards the selected quantity", async () => {
    const user = userEvent.setup();
    vi.mocked(removeStoredMealQuantityAction).mockResolvedValue({ type: "success", lot: null });
    render(<StorageList lots={[lot]} familyMembers={[member]} />);

    await user.click(screen.getByRole("button", { name: "Discard Soup" }));
    const dialog = await screen.findByRole("dialog", { name: "Discard Soup" });
    const input = within(dialog).getByRole("spinbutton", { name: "Meals" });
    await user.clear(input);
    await user.type(input, "2");
    await user.click(within(dialog).getByRole("button", { name: "Discard meals" }));

    await waitFor(() => expect(removeStoredMealQuantityAction).toHaveBeenCalledWith({
      lotId: "lot-1",
      expectedVersion: 2,
      quantity: 2,
      reason: "DISCARDED",
    }));
  });
});
