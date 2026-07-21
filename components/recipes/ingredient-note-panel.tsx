"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type IngredientNotePanelProps = {
  mode: "edit" | "view";
  value: string | null | undefined;
  onChange?: (value: string) => void;
  className?: string;
};

/** Row-level additional info — editable in form, read-only on recipe page. */
export function IngredientNotePanel({
  mode,
  value,
  onChange,
  className,
}: IngredientNotePanelProps) {
  const normalized = value?.trim() ?? "";

  return (
    <div
      className={cn(
        // Match secondary badge surface (person amount chips) for a clear inset on bg-card.
        "rounded-md bg-secondary p-nest",
        className,
      )}
    >
      <p className="mb-tight text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Note
      </p>
      {mode === "edit" ? (
        <Input
          type="text"
          placeholder="e.g. room temperature"
          value={normalized}
          onChange={(event) => onChange?.(event.target.value)}
          maxLength={50}
          className="min-w-0 max-w-full"
        />
      ) : normalized ? (
        <p className="type-body text-foreground">{normalized}</p>
      ) : (
        <p className="type-body text-muted-foreground">No note added.</p>
      )}
    </div>
  );
}
