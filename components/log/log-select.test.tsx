import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/constants";
import { LogSelect } from "./log-select";

// Radix Select expects pointer capture APIs that jsdom does not implement.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function hasPointerCapture() {
    return false;
  };
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function setPointerCapture() {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture =
    function releasePointerCapture() {};
}

const pushMock = vi.fn();

const searchParamsStore = {
  params: new URLSearchParams("person=SECONDARY&day=2026-03-18"),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => searchParamsStore.params,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

describe("LogSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsStore.params = new URLSearchParams(
      "person=SECONDARY&day=2026-03-18",
    );
  });

  it("navigates to the selected log and preserves query string", async () => {
    const user = userEvent.setup();
    const logs = [
      { id: "log-a", label: "Jan 1 - Jan 7" },
      { id: "log-b", label: "Feb 1 - Feb 7" },
    ];

    render(<LogSelect logs={logs} currentLogId="log-a" />);

    await user.click(screen.getByRole("combobox"));
    const option = await waitFor(() =>
      screen.getByRole("option", { name: /Feb 1 - Feb 7/ }),
    );
    await user.click(option);

    expect(pushMock).toHaveBeenCalledWith(
      `${ROUTES.logView("log-b")}?person=SECONDARY&day=2026-03-18`,
    );
  });

  it("pushes canonical log URL only when there are no search params", async () => {
    const user = userEvent.setup();
    searchParamsStore.params = new URLSearchParams();

    const logs = [
      { id: "log-a", label: "Jan 1 - Jan 7" },
      { id: "log-b", label: "Feb 1 - Feb 7" },
    ];

    render(<LogSelect logs={logs} currentLogId="log-a" />);

    await user.click(screen.getByRole("combobox"));
    const option = await waitFor(() =>
      screen.getByRole("option", { name: /Feb 1 - Feb 7/ }),
    );
    await user.click(option);

    expect(pushMock).toHaveBeenCalledWith(ROUTES.logView("log-b"));
  });
});
