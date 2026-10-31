import { IngredientIcon } from "@/components/ingredient-icon";

type RecipeGridEmptyProps = {
  archived?: boolean;
  hasFilters?: boolean;
};

export function RecipeGridEmpty({
  archived = false,
  hasFilters = false,
}: RecipeGridEmptyProps) {
  const heading = archived
    ? hasFilters
      ? "No archived recipes match these filters"
      : "No archived recipes"
    : hasFilters
      ? "No recipes match these filters"
      : "No active recipes";
  const description = hasFilters
    ? "Try changing or clearing your filters."
    : archived
      ? "Recipes you archive will appear here."
      : "Create a recipe to start your collection.";

  return (
    <div
      className="col-span-full flex min-h-[min(320px,50vh)] flex-col items-center justify-center gap-comfort rounded-xl border border-dashed border-border bg-card px-empty-x py-empty-y text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden
      >
        <IngredientIcon icon="sausage.svg" name="" size={28} />
      </div>
      <div className="space-y-cozy">
        <p className="type-h3 text-foreground">{heading}</p>
        <p className="max-w-sm type-body-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
