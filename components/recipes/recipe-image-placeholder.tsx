"use client";

import { IngredientIcon } from "@/components/ingredient-icon";
import { cn } from "@/lib/utils";

type RecipeImagePlaceholderProps = {
  className?: string;
  showLabel?: boolean;
  /** Larger icon circle for compact cards (e.g. planner custom meals). */
  iconSize?: "default" | "lg";
};

export function RecipeImagePlaceholder({
  className,
  showLabel = true,
  iconSize = "default",
}: RecipeImagePlaceholderProps) {
  const isLargeIcon = iconSize === "lg";
  return (
    <div
      className={cn(
        // Keep placeholder neutral and token-driven so it matches light/dark themes.
        "absolute inset-0 flex items-center justify-center bg-accent",
        className,
      )}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-tight text-muted-foreground/80">
        {/* Reuse the same ingredient SVG style as recipe empty states. */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted/80",
            isLargeIcon ? "size-16" : "size-7",
          )}
        >
          <IngredientIcon
            icon="broccoli.svg"
            name=""
            size={isLargeIcon ? 40 : 18}
          />
        </div>
        {showLabel ? (
          <span className="type-micro uppercase tracking-wide">Eat your greens</span>
        ) : null}
      </div>
    </div>
  );
}
