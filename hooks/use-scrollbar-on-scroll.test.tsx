// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollbarOnScroll } from "./use-scrollbar-on-scroll";

function Harness() {
  const scrollbar = useScrollbarOnScroll();
  return (
    <div
      onScroll={scrollbar.onScroll}
      style={scrollbar.style}
      className={scrollbar.className}
      data-testid="scroll-panel"
    />
  );
}

describe("useScrollbarOnScroll", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps gutter and padding unchanged while scrolling and after becoming idle", () => {
    vi.useFakeTimers();
    render(<Harness />);
    const panel = screen.getByTestId("scroll-panel");
    const initialStyle = panel.getAttribute("style");
    expect(panel.style.scrollbarGutter).toBe("stable");
    expect(panel.style.paddingInlineEnd).toBe("");
    fireEvent.scroll(panel);
    expect(panel.getAttribute("style")).toBe(initialStyle);
    act(() => vi.advanceTimersByTime(1000));
    expect(panel.getAttribute("style")).toBe(initialStyle);
  });
});
