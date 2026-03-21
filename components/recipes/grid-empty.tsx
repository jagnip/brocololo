import { IngredientIcon } from "@/components/ingredient-icon";

export function RecipeGridEmpty() {
  return (
    <div
      className="col-span-full flex min-h-[min(320px,50vh)] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/30 px-6 py-14 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden
      >
        <IngredientIcon icon="sausage.svg" name="" size={28} />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-medium text-foreground">No recipes found</p>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">You silly sausage</p>
      </div>
    </div>
  );
}
