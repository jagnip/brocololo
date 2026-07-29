"use client";

import * as React from "react";
import { Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";

import { useCanHover } from "@/hooks/use-can-hover";
import { cn } from "@/lib/utils";

type TooltipInteractionMode = "hover" | "touch";

const TooltipInteractionContext =
  React.createContext<TooltipInteractionMode | null>(null);

function useTooltipInteraction(): TooltipInteractionMode {
  const context = React.useContext(TooltipInteractionContext);
  const canHover = useCanHover();
  return context ?? (canHover ? "hover" : "touch");
}

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  const canHover = useCanHover();
  const mode: TooltipInteractionMode = canHover ? "hover" : "touch";

  return (
    <TooltipInteractionContext.Provider value={mode}>
      <TooltipPrimitive.Provider
        data-slot="tooltip-provider"
        delayDuration={delayDuration}
        {...props}
      />
    </TooltipInteractionContext.Provider>
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const mode = useTooltipInteraction();

  // Touch: click-to-toggle popover. Hover: native tooltip.
  if (mode === "touch") {
    const {
      delayDuration: _delayDuration,
      disableHoverableContent: _disableHoverableContent,
      ...popoverProps
    } = props;

    return (
      <PopoverPrimitive.Root
        data-slot="tooltip"
        {...(popoverProps as React.ComponentProps<typeof PopoverPrimitive.Root>)}
      />
    );
  }

  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const mode = useTooltipInteraction();

  if (mode === "touch") {
    return (
      <PopoverPrimitive.Trigger
        data-slot="tooltip-trigger"
        {...(props as React.ComponentProps<typeof PopoverPrimitive.Trigger>)}
      />
    );
  }

  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

const tooltipContentClassName =
  "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance";

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const mode = useTooltipInteraction();

  if (mode === "touch") {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          // Keep focus on the trigger — this is a toggletip, not a dialog.
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            tooltipContentClassName,
            "origin-(--radix-popover-content-transform-origin) outline-hidden",
            className,
          )}
          {...(props as React.ComponentProps<typeof PopoverPrimitive.Content>)}
        >
          {children}
          <PopoverPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(tooltipContentClassName, className)}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
