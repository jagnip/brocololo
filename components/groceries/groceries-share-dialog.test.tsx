import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroceriesShareDialog } from "./groceries-share-dialog";

vi.mock("@/actions/shopping-list-share-actions", () => ({
  getActiveShoppingListShareAction: vi.fn(),
  createShoppingListShareAction: vi.fn(),
  revokeShoppingListShareAction: vi.fn(),
}));

import {
  createShoppingListShareAction,
  getActiveShoppingListShareAction,
} from "@/actions/shopping-list-share-actions";

describe("GroceriesShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveShoppingListShareAction).mockResolvedValue({ type: "none" });
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("creates a link and shows the url", async () => {
    const user = userEvent.setup();
    vi.mocked(createShoppingListShareAction).mockResolvedValue({
      type: "success",
      url: "https://app.example.com/share/groceries/tok",
      expiresAt: new Date("2026-06-10T12:00:00.000Z").toISOString(),
    });

    render(
      <GroceriesShareDialog open planId="plan-1" onOpenChange={() => undefined} />,
    );

    await user.click(screen.getByRole("button", { name: "Create link" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("https://app.example.com/share/groceries/tok")).toBeInTheDocument();
    });
  });
});
