/** Focus an input after popover close / layout (double rAF). */
export function focusInputAfterLayout(input: HTMLInputElement | null) {
  if (!input) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  });
}

/** Focus the visible amount field inside a groceries row or quick-add section. */
export function focusVisibleAmountInputInContainer(container: HTMLElement | null) {
  if (!container) return;
  const inputs = container.querySelectorAll<HTMLInputElement>(
    "[data-grocery-amount-input]",
  );
  for (const input of inputs) {
    if (input.offsetParent !== null && !input.disabled) {
      focusInputAfterLayout(input);
      return;
    }
  }
}
