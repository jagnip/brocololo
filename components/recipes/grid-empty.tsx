import { IngredientIcon } from "@/components/ingredient-icon";

export function RecipeGridEmpty() {
  return (
    <div
      className="col-span-full flex min-h-[min(320px,50vh)] flex-col items-center justify-center gap-comfort rounded-xl border border-dashed border-border/80 bg-muted/30 px-empty-x py-empty-y text-center"
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
        <p className="type-h3 text-foreground">No recipes found</p>
        <p className="max-w-sm type-body-relaxed text-muted-foreground">You silly sausage</p>
      </div>
    </div>
  );
}
