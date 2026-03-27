import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import { useRecipePageHeaderData } from "@/components/context/recipe-page-context";

export function NotesSection() {
  const { recipe } = useRecipePageHeaderData();

  if (!recipe.notes || recipe.notes.length === 0) {
    return null;
  }

  const renderTextWithMarkdownLinks = (text: string, keyPrefix: string) =>
    // Render markdown links safely without injecting HTML.
    parseMarkdownLinks(text).map((segment, index) => {
      if (segment.type === "link") {
        return (
          <a
            key={`${keyPrefix}-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all"
          >
            {segment.label}
          </a>
        );
      }

      return <span key={`${keyPrefix}-${index}`}>{segment.content}</span>;
    });

  return (
    <div className="rounded-xl bg-card antialiased">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base leading-5 font-semibold text-foreground">
          Notes
        </h3>
      </div>
      <div className="rounded-[10px] border border-border bg-card p-2">
        <ul className="list-disc list-inside space-y-2 text-sm leading-5 text-foreground">
          {recipe.notes.map((note: string, index: number) => (
            <li key={index} className="whitespace-pre-wrap">
              {renderTextWithMarkdownLinks(note, `note-${index}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
