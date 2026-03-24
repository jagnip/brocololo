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
    <div>
      <h3 className="font-semibold mb-2">Notes</h3>
      <ul className="list-disc list-inside space-y-1 text-sm">
        {recipe.notes.map((note: string, index: number) => (
          <li key={index}>{renderTextWithMarkdownLinks(note, `note-${index}`)}</li>
        ))}
      </ul>
    </div>
  );
}
