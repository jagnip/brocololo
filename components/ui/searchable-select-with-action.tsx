"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

type SearchableSelectWithActionProps = ComponentProps<typeof SearchableSelect> & {
  /** Accessible name for the trailing action (e.g. “Edit ingredient”). */
  actionAriaLabel: string;
  /** Icon inside the trailing action button. */
  actionIcon: ReactNode;
  onActionClick: () => void;
  /** When true, action stays visible but inactive (e.g. no ingredient selected). */
  actionDisabled?: boolean;
};

/**
 * SearchableSelect with a trailing action fused into one control —
 * shared border shell, hairline divider, design-system outline language.
 * Select behavior is unchanged; only the chrome is composed.
 */
export function SearchableSelectWithAction({
  actionAriaLabel,
  actionIcon,
  onActionClick,
  actionDisabled = false,
  className,
  size = "default",
  ...selectProps
}: SearchableSelectWithActionProps) {
  const actionSize = size === "sm" ? "icon-sm" : "icon";

  return (
    <div
      className={cn(
        // One field shell — matches Input / SearchableSelect border tokens.
        "flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-card shadow-xs",
        // Single focus ring for the whole control (select or action).
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      <div
        className={cn(
          "min-w-0 flex-1",
          // Flatten the select trigger so it lives inside the shared shell (no double border).
          "**:data-[slot=button]:h-full **:data-[slot=button]:rounded-none **:data-[slot=button]:border-0 **:data-[slot=button]:bg-transparent **:data-[slot=button]:shadow-none",
          "**:data-[slot=button]:focus-visible:border-transparent **:data-[slot=button]:focus-visible:ring-0",
          // Linked-href combobox variant also paints its own shell — strip that too.
          "**:[[role=combobox]]:h-full **:[[role=combobox]]:rounded-none **:[[role=combobox]]:border-0 **:[[role=combobox]]:bg-transparent **:[[role=combobox]]:shadow-none",
        )}
      >
        <SearchableSelect {...selectProps} size={size} className="w-full font-normal" />
      </div>

      <Button
        type="button"
        variant="ghost"
        size={actionSize}
        disabled={actionDisabled}
        aria-label={actionAriaLabel}
        onClick={onActionClick}
        // Divider + muted icon; hover uses muted surface (outline family), not pink accent.
        className="shrink-0 rounded-none border-l border-input text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {actionIcon}
      </Button>
    </div>
  );
}
