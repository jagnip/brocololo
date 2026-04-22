"use client";

import { IngredientIcon } from "@/components/ingredient-icon";
import { cn } from "@/lib/utils";

type RecipeImagePlaceholderProps = {
  className?: string;
  showLabel?: boolean;
};

export function RecipeImagePlaceholder({
  className,
  showLabel = true,
}: RecipeImagePlaceholderProps) {
  return (
    <div
      className={cn(
        // Keep placeholder neutral and token-driven so it matches light/dark themes.
        "absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted via-muted to-muted-foreground/25",
        className,
      )}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-tight text-muted-foreground/80">
        {/* Reuse the same ingredient SVG style as recipe empty states. */}
        <div className="flex size-7 items-center justify-center rounded-full bg-muted/80">
          <IngredientIcon icon="broccoli.svg" name="" size={18} />
        </div>
        {showLabel ? (
          <span className="type-micro uppercase tracking-wide">Eat your greens</span>
        ) : null}
      </div>
    </div>
  );
}
