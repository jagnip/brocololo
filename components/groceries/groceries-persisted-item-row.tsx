"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, CircleAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { setShoppingListItemPurchasedAction } from "@/actions/shopping-list-actions";
import { IngredientIcon } from "@/components/ingredient-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatAmount } from "@/lib/groceries/helpers";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import { cn } from "@/lib/utils";

type GroceriesPersistedItemRowProps = {
  row: {
    id: string;
    displayLabel: string;
    amount: number | null;
    purchased: boolean;
    additionalInfo: string | null;
    substitutionsAllowed: boolean;
    substitutionNote: string | null;
    unit: {
      name: string;
      namePlural: string | null;
    } | null;
    groceryIngredient: {
      ingredient: {
        icon: string | null;
        supermarketUrl: string | null;
      } | null;
    } | null;
    // Comma-joined recipe names from list generation; shown as secondary badges.
    recipeAttribution: string | null;
  };
};

// Same split as groceries edit: attribution is stored as comma-joined names at generation time.
function parseRecipeNames(attribution: string | null): string[] {
  if (!attribution) return [];
  return attribution
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function GroceriesPersistedItemRow({ row }: GroceriesPersistedItemRowProps) {
  const [isPending, startTransition] = useTransition();
  const [isPurchased, setIsPurchased] = useState(row.purchased);

  const ing = row.groceryIngredient?.ingredient;
  const recipeNames = useMemo(
    () => parseRecipeNames(row.recipeAttribution),
    [row.recipeAttribution],
  );
  const hasMeta = Boolean(
    row.additionalInfo || (row.substitutionsAllowed && row.substitutionNote),
  );

  const displayUnit = getUnitDisplayName({
    amount: row.amount,
    unitName: row.unit?.name ?? null,
    unitNamePlural: row.unit?.namePlural ?? null,
  });
  const amountLabel =
    row.amount !== null
      ? `${formatAmount(row.amount)} ${displayUnit}`.trim()
      : displayUnit || "—";

  const onTogglePurchased = (next: boolean) => {
    const previous = isPurchased;
    setIsPurchased(next);
    startTransition(async () => {
      const result = await setShoppingListItemPurchasedAction({
        itemId: row.id,
        purchased: next,
      });
      if (result.type === "error") {
        setIsPurchased(previous);
        toast.error(result.message);
      }
    });
  };

  return (
    <li className="py-0">
      <div
        className={cn(
          "flex items-start justify-between gap-3 py-3",
          !isPending && "cursor-pointer",
          hasMeta ? "border-b border-dashed pb-3" : "",
        )}
        role="button"
        tabIndex={0}
        aria-label={`Toggle bought for ${row.displayLabel}`}
        aria-pressed={isPurchased}
        onClick={() => {
          if (isPending) return;
          onTogglePurchased(!isPurchased);
        }}
        onKeyDown={(event) => {
          if (isPending) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTogglePurchased(!isPurchased);
          }
        }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="self-start -mt-0.5">
            <IngredientIcon icon={ing?.icon ?? null} name={row.displayLabel} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-start gap-1">
              <div
                className={cn(
                  "font-medium text-foreground",
                  isPurchased && "text-muted-foreground line-through",
                )}
              >
                {row.displayLabel}
              </div>
              {ing?.supermarketUrl ? (
                <div className="self-start" onClick={(event) => event.stopPropagation()}>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-muted-foreground [&_svg]:text-muted-foreground [&_svg]:opacity-70"
                    aria-label={`Open ${row.displayLabel} in supermarket`}
                  >
                    <Link
                      href={ing.supermarketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground",
                isPurchased && "line-through",
              )}
            >
              <span className="shrink-0">{amountLabel}</span>
              {recipeNames.length > 0 ? (
                <span
                  className="flex flex-wrap items-center gap-1.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  {recipeNames.map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="max-w-48 truncate font-normal"
                    >
                      {name}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1 self-start -mt-0.5">
          <div onClick={(event) => event.stopPropagation()}>
            <Checkbox
              className="h-5 w-5 rounded-full"
              checked={isPurchased}
              onCheckedChange={(checked) => onTogglePurchased(checked === true)}
              disabled={isPending}
              aria-label={`Mark ${row.displayLabel} as bought`}
            />
          </div>
        </div>
      </div>

      {hasMeta ? (
        <div className="space-y-1 bg-muted/50 px-3 py-2 text-sm">
          {row.additionalInfo ? (
            <p
              className={cn(
                "flex items-start gap-2 text-muted-foreground",
                isPurchased && "opacity-60",
              )}
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {row.additionalInfo}
            </p>
          ) : null}
          {row.substitutionsAllowed && row.substitutionNote ? (
            <p
              className={cn(
                "flex items-start gap-2 text-muted-foreground",
                isPurchased && "opacity-60",
              )}
            >
              <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {row.substitutionNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
