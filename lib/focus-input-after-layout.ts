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

/** Focus the visible additional-info field in spotlight Quick add after unit select. */
export function focusQuickAddAdditionalInfoInput(container: HTMLElement | null) {
  if (!container) return;
  const inputs = container.querySelectorAll<HTMLInputElement>(
    "[data-quick-add-additional-info]",
  );
  for (const input of inputs) {
    if (input.offsetParent !== null && !input.disabled) {
      focusInputAfterLayout(input);
      return;
    }
  }
}

/** Blur the focused control inside a groceries row (commit without adding another row). */
export function blurFocusedElementInContainer(container: HTMLElement | null) {
  if (!container) return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && container.contains(active)) {
    active.blur();
  }
}

/** Focus the visible additional-info field in a category groceries row. */
export function focusGroceriesRowAdditionalInfoInput(container: HTMLElement | null) {
  if (!container) return;
  const inputs = container.querySelectorAll<HTMLInputElement>(
    "[data-grocery-row-additional-info]",
  );
  for (const input of inputs) {
    if (input.offsetParent !== null && !input.disabled) {
      focusInputAfterLayout(input);
      return;
    }
  }
}

/** Focus the visible ingredient combobox in spotlight Quick add (batch entry loop). */
export function focusQuickAddIngredientSelector(container: HTMLElement | null) {
  if (!container) return;
  const triggers = container.querySelectorAll<HTMLElement>(
    "[data-quick-add-ingredient-select] [role='combobox']",
  );
  for (const trigger of triggers) {
    if (trigger.offsetParent !== null && !trigger.hasAttribute("disabled")) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => trigger.focus());
      });
      return;
    }
  }
}
