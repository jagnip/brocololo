"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRightLeft, CircleAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { setShoppingListItemPurchasedAction } from "@/actions/shopping-list-actions";
import { IngredientIcon } from "@/components/ingredient-icon";
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
  };
};

export function GroceriesPersistedItemRow({ row }: GroceriesPersistedItemRowProps) {
  const [isPending, startTransition] = useTransition();
  const [isPurchased, setIsPurchased] = useState(row.purchased);

  const ing = row.groceryIngredient?.ingredient;
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
    <li className="px-4 py-3">
      <div
        className={cn(
          "flex items-start justify-between gap-3",
          hasMeta ? "border-b border-dashed pb-3" : "",
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Checkbox
            className="mt-0.5 h-5 w-5 rounded-full"
            checked={isPurchased}
            onCheckedChange={(checked) => onTogglePurchased(checked === true)}
            disabled={isPending}
            aria-label={`Mark ${row.displayLabel} as bought`}
          />
          <IngredientIcon icon={ing?.icon ?? null} name={row.displayLabel} />
          <div className="min-w-0 space-y-1">
            <div
              className={cn(
                "font-medium text-foreground",
                isPurchased && "text-muted-foreground line-through",
              )}
            >
              {row.displayLabel}
            </div>
            <div
              className={cn(
                "text-sm text-muted-foreground",
                isPurchased && "line-through",
              )}
            >
              {amountLabel}
            </div>
          </div>
        </div>

        {ing?.supermarketUrl ? (
          <Button
            asChild
            variant="secondary"
            size="icon-sm"
            className="shrink-0"
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
        ) : null}
      </div>

      {hasMeta ? (
        <div className="mt-2 space-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm">
          {row.additionalInfo ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {row.additionalInfo}
            </p>
          ) : null}
          {row.substitutionsAllowed && row.substitutionNote ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {row.substitutionNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
