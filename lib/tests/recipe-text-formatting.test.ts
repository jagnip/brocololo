import { describe, expect, it } from "vitest";
import { parseMarkdownLinks } from "../recipes/text-formatting";

describe("parseMarkdownLinks", () => {
  it("parses a single markdown link with surrounding text", () => {
    const parsed = parseMarkdownLinks(
      "Read [Serious Eats](https://www.seriouseats.com) first.",
    );

    expect(parsed).toEqual([
      { type: "text", content: "Read " },
      {
        type: "link",
        label: "Serious Eats",
        href: "https://www.seriouseats.com/",
      },
      { type: "text", content: " first." },
    ]);
  });

  it("parses multiple markdown links in a single line", () => {
    const parsed = parseMarkdownLinks(
      "[One](https://one.com) and [Two](https://two.com).",
    );

    expect(parsed).toEqual([
      { type: "link", label: "One", href: "https://one.com/" },
      { type: "text", content: " and " },
      { type: "link", label: "Two", href: "https://two.com/" },
      { type: "text", content: "." },
    ]);
  });

  it("treats disallowed protocols as plain text", () => {
    const parsed = parseMarkdownLinks(
      "Use [this](javascript:alert('xss')) with caution",
    );

    expect(parsed).toEqual([
      {
        type: "text",
        content: "Use [this](javascript:alert('xss')) with caution",
      },
    ]);
  });

  it("returns plain text when markdown is malformed", () => {
    const parsed = parseMarkdownLinks("Broken [link](https://example.com");

    expect(parsed).toEqual([
      { type: "text", content: "Broken [link](https://example.com" },
    ]);
  });

  it("returns plain text when link label is empty", () => {
    const parsed = parseMarkdownLinks("Check [](https://example.com)");

    expect(parsed).toEqual([
      { type: "text", content: "Check [](https://example.com)" },
    ]);
  });
});
