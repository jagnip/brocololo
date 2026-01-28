import { describe, expect, it } from "vitest";
import { buildIconPickerOptions, iconLabel } from "./icon-picker";

describe("icon-picker label normalization", () => {
  it("replaces hyphens with spaces and strips .svg extension", () => {
    // User-facing labels should be readable, while source filenames can stay machine-oriented.
    expect(iconLabel("vanilla-extract.svg")).toBe("vanilla extract");
  });

  it("strips extension case-insensitively", () => {
    // Existing mixed-case extensions should still normalize correctly.
    expect(iconLabel("star-anise.SVG")).toBe("star anise");
  });
});

describe("buildIconPickerOptions", () => {
  it("keeps raw filename as value/searchText while normalizing label", () => {
    // Preserve raw value/search for backward compatibility and dual search matching.
    const options = buildIconPickerOptions(["vanilla-extract.svg"]);

    expect(options).toEqual([
      {
        value: "vanilla-extract.svg",
        label: "vanilla extract",
        searchText: "vanilla-extract.svg",
        icon: "vanilla-extract.svg",
      },
    ]);
  });

  it("does not alter names that already contain spaces", () => {
    // Hyphen-only normalization should not rewrite existing space-based filenames.
    const options = buildIconPickerOptions(["milk box.svg"]);

    expect(options[0]?.label).toBe("milk box");
  });
});
