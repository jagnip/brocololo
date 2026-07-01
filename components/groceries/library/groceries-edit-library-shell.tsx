"use client";

import type { ReactNode, RefObject } from "react";
import { useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  GroceriesEditLibraryPanel,
  type GroceriesEditLibraryPanelProps,
} from "@/components/groceries/library/groceries-edit-library-panel";
import { useIsLg } from "@/hooks/use-is-lg";
import { cn } from "@/lib/utils";

type GroceriesEditLibraryShellProps = GroceriesEditLibraryPanelProps & {
  className?: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function LibraryCreateButton({
  createListOpenerRef,
}: {
  createListOpenerRef: RefObject<(() => void) | null>;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8 shrink-0"
      aria-label="Create new list"
      onClick={() => createListOpenerRef.current?.()}
    >
      <Plus className="size-4" aria-hidden />
    </Button>
  );
}

// Outlined chevron beside the Lists label — sidebar uses left/right like the planner rail.
function LibrarySidebarCollapseButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse lists" : "Expand lists"}
      className="size-8 shrink-0"
    >
      {expanded ? (
        <ChevronRight className="size-4" aria-hidden />
      ) : (
        <ChevronLeft className="size-4" aria-hidden />
      )}
    </Button>
  );
}

function LibraryShellHeader({
  showTitle,
  createListOpenerRef,
  collapseControl,
  flushBottom = false,
}: {
  showTitle: boolean;
  createListOpenerRef: RefObject<(() => void) | null>;
  collapseControl: ReactNode;
  /** When true, omit bottom padding so panel/content supplies the gap below. */
  flushBottom?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        showTitle ? cn("p-4", flushBottom ? "pb-0" : undefined) : "justify-center p-0",
      )}
    >
      <div className="flex items-center gap-1.5">
        {showTitle ? (
          <h2 className="text-sm font-semibold tracking-tight">Lists</h2>
        ) : null}
        {collapseControl}
      </div>
      {showTitle ? (
        <LibraryCreateButton createListOpenerRef={createListOpenerRef} />
      ) : null}
    </div>
  );
}

export function GroceriesEditLibraryShell({
  className,
  collapsed,
  onCollapsedChange,
  ...panelProps
}: GroceriesEditLibraryShellProps) {
  const isLg = useIsLg();
  const [accordionOpen, setAccordionOpen] = useState(true);
  const createListOpenerRef = useRef<(() => void) | null>(null);

  const panel = (
    <GroceriesEditLibraryPanel
      {...panelProps}
      showHeader={false}
      chrome="embedded"
      createListOpenerRef={createListOpenerRef}
    />
  );

  // Desktop lg+: Lists title + outlined chevron in the sidebar header.
  if (isLg) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          !collapsed &&
            "xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto",
          className,
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-col",
            !collapsed && "rounded-xl border bg-card",
          )}
        >
          <LibraryShellHeader
            showTitle={!collapsed}
            flushBottom={!collapsed}
            createListOpenerRef={createListOpenerRef}
            collapseControl={
              <LibrarySidebarCollapseButton
                expanded={!collapsed}
                onClick={() => onCollapsedChange(!collapsed)}
              />
            }
          />
          {!collapsed ? <div className="px-4 pb-4 pt-4">{panel}</div> : null}
        </div>
      </div>
    );
  }

  // Below lg: accordion above quick add — Lists + outlined chevron + create.
  return (
    <Collapsible
      open={accordionOpen}
      onOpenChange={setAccordionOpen}
      className={cn("rounded-xl border bg-card", className)}
    >
      <LibraryShellHeader
        showTitle
        flushBottom={accordionOpen}
        createListOpenerRef={createListOpenerRef}
        collapseControl={
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              aria-label={accordionOpen ? "Collapse lists" : "Expand lists"}
            >
              {accordionOpen ? (
                <ChevronUp className="size-4" aria-hidden />
              ) : (
                <ChevronDown className="size-4" aria-hidden />
              )}
            </Button>
          </CollapsibleTrigger>
        }
      />
      <CollapsibleContent className="px-4 pb-4 pt-4">{panel}</CollapsibleContent>
    </Collapsible>
  );
}
