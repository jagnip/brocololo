"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IngredientSupermarketLinkButtonProps = {
  href: string | null | undefined;
  ingredientLabel: string;
  className?: string;
};

// Shared ghost ExternalLink button used by grocery view rows and library panel rows.
export function IngredientSupermarketLinkButton({
  href,
  ingredientLabel,
  className,
}: IngredientSupermarketLinkButtonProps) {
  const trimmedHref = href?.trim();
  if (!trimmedHref) return null;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon-sm"
      className={cn(
        "h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-muted-foreground [&_svg]:text-muted-foreground [&_svg]:opacity-70",
        className,
      )}
      aria-label={`Open ${ingredientLabel} in supermarket`}
    >
      <Link href={trimmedHref} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  );
}
