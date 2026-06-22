import Link from "next/link";
import type { MouseEvent } from "react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type IngredientNameLinkProps = {
  name: string;
  slug?: string | null;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onMouseDown?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/** Ingredient title link — matches meal-plan recipe title treatment (underline on hover). */
export function IngredientNameLink({
  name,
  slug,
  className,
  onClick,
  onMouseDown,
}: IngredientNameLinkProps) {
  if (!slug) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link
      href={ROUTES.ingredientEdit(slug)}
      className={cn(
        // inline-block so truncate + underline apply to the label text, not a flex row.
        "inline-block max-w-full decoration-foreground underline-offset-2 hover:underline focus-visible:underline",
        className,
      )}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {name}
    </Link>
  );
}
