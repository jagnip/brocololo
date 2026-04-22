"use client";

import { ImageIcon } from "lucide-react";
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
        <ImageIcon className="h-5 w-5" />
        {showLabel ? (
          <span className="type-micro uppercase tracking-wide">No photo</span>
        ) : null}
      </div>
    </div>
  );
}
