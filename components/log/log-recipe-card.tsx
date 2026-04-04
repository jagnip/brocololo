import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import type { LogSlotData } from "@/lib/log/view-model";
import { cn } from "@/lib/utils";

type LogRecipeCardProps = {
  cardKind?: "recipe" | "custom" | "removed";
  /** Meal column label (Breakfast, Lunch, …) — same micro style as the old “No recipe” line on custom cards. */
  mealSlotLabel: LogSlotData["label"];
  title: string;
  slug: string | null;
  imageUrl: string | null;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  /** True when this row is the one open in the ingredient editor (matches recipe-page instruction selection). */
  isSelected?: boolean;
  onClick?: () => void;
  /** Top-right icon control; kept separate from primary card click (open editor). */
  onRemove?: () => void;
};

export function LogRecipeCard({
  cardKind = "recipe",
  mealSlotLabel,
  title,
  slug,
  imageUrl,
  calories,
  proteins,
  fats,
  carbs,
  isSelected = false,
  onClick,
  onRemove,
}: LogRecipeCardProps) {
  return (
    <Card
      className={cn(
        // Height follows content (text + wrapping macros); image column stretches to match (LogPlannerPoolCard pattern).
        "flex flex-row items-stretch gap-0 overflow-hidden rounded-lg border p-0 py-0 shadow-none transition-colors",
        onRemove && "relative",
        isSelected ? "border-foreground bg-muted/60" : "border-border/60 bg-card",
        onClick && "group",
        onClick && !isSelected && "cursor-pointer hover:bg-muted/40",
        onClick && isSelected && "cursor-pointer",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1.5 top-1.5 z-10 h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove from slot"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}

      <div
        className={cn(
          "relative w-1/4 shrink-0 basis-1/4 self-stretch overflow-hidden transition-colors",
          isSelected
            ? "bg-transparent"
            : onClick
              ? "bg-muted group-hover:bg-transparent"
              : "bg-muted",
        )}
      >
        {/* Custom log meals always use the grey placeholder strip (same as no-image), not a recipe photo. */}
        {imageUrl && cardKind !== "custom" ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            // ~¼ card width; avoid tiny `sizes` (e.g. 80px) or Next serves low-res src for retina / wide log columns.
            sizes="(max-width: 768px) 28vw, 200px"
            quality={85}
          />
        ) : (
          <div
            className="absolute inset-0 bg-linear-to-br from-muted via-muted to-muted-foreground/25"
            aria-hidden
          />
        )}
      </div>

      {/* Padding + vertical gap match LogPlannerPoolCard; pr reserves space for the remove icon (top-right). */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col justify-center gap-2 p-3",
          onRemove && "pr-10",
        )}
      >
        <p className="type-micro uppercase tracking-wide text-muted-foreground">
          {mealSlotLabel}
        </p>
        {slug && !onClick ? (
          <Link
            href={ROUTES.recipe(slug)}
            className="min-w-0 truncate text-sm font-medium leading-snug hover:underline"
            title={title}
            onClick={(e) => e.stopPropagation()}
          >
            {title}
          </Link>
        ) : (
          <p
            className="truncate text-sm font-medium leading-snug text-foreground"
            title={title}
          >
            {title}
          </p>
        )}
        <div className="flex min-w-0 flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn(
              "px-1 py-0 text-[10px] tabular-nums",
              isSelected && "border-foreground/20 bg-background",
            )}
          >
            {calories.toFixed(0)} kcal
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "px-1 py-0 text-[10px] tabular-nums",
              isSelected && "border-foreground/20 bg-background",
            )}
          >
            {proteins.toFixed(1)}g protein
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "px-1 py-0 text-[10px] tabular-nums",
              isSelected && "border-foreground/20 bg-background",
            )}
          >
            {fats.toFixed(1)}g fat
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "px-1 py-0 text-[10px] tabular-nums",
              isSelected && "border-foreground/20 bg-background",
            )}
          >
            {carbs.toFixed(1)}g carbs
          </Badge>
        </div>
      </div>
    </Card>
  );
}
