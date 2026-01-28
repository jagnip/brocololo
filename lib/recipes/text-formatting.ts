export type TextSegment =
  | { type: "text"; content: string }
  | { type: "link"; label: string; href: string };

const markdownLinkRegex = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function normalizeSafeExternalUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    // Keep outbound links tightly scoped to web-safe protocols.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseMarkdownLinks(text: string): TextSegment[] {
  if (!text) {
    return [];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const [rawMatch, label, rawUrl] = match;
    const safeHref = normalizeSafeExternalUrl(rawUrl);
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, matchStart),
      });
    }

    if (safeHref) {
      segments.push({
        type: "link",
        label,
        href: safeHref,
      });
    } else {
      // Invalid/disallowed links degrade to plain text, never clickable HTML.
      segments.push({
        type: "text",
        content: rawMatch,
      });
    }

    lastIndex = matchStart + rawMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  if (segments.length === 0) {
    return [{ type: "text", content: text }];
  }

  // Coalesce neighboring text tokens for cleaner rendering/testability.
  return segments.reduce<TextSegment[]>((acc, segment) => {
    const last = acc[acc.length - 1];
    if (segment.type === "text" && last?.type === "text") {
      last.content += segment.content;
      return acc;
    }
    acc.push(segment);
    return acc;
  }, []);
}
