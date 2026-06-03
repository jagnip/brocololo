"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  tooltip?: React.ReactNode;
  tooltipAriaLabel?: string;
  tooltipContentClassName?: string;
};

function Label({
  className,
  tooltip,
  tooltipAriaLabel = "Show field guidance",
  tooltipContentClassName,
  ...props
}: LabelProps) {
  const label = (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs tracking-wide uppercase text-muted-foreground font-semibold leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );

  if (!tooltip) {
    return label;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-auto w-auto items-center px-1 py-0 text-muted-foreground outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] [&_svg]:size-4"
              aria-label={tooltipAriaLabel}
            >
              <Info strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent className={cn("max-w-xs", tooltipContentClassName)}>
            {/* Labels own short guidance copy so forms can opt into tooltips consistently. */}
            {typeof tooltip === "string" ? <p>{tooltip}</p> : tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

export { Label };
export type { LabelProps };
