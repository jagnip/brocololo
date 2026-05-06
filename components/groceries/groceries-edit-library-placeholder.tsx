import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type GroceriesEditLibraryPlaceholderProps = {
  className?: string;
};

export function GroceriesEditLibraryPlaceholder({
  className,
}: GroceriesEditLibraryPlaceholderProps) {
  return (
    <aside
      className={cn(
        "rounded-xl border bg-muted/40 p-4",
        // Keep placeholder aligned with top bar while the page scrolls.
        "xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto",
        className,
      )}
      aria-label="Ingredient library placeholder"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">Add from library</h2>
          <p className="text-xs text-muted-foreground">
            Placeholder for quick-add ingredient lists.
          </p>
        </div>

        {/* Reserved UI structure so real list/search can be dropped in later. */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </aside>
  );
}
