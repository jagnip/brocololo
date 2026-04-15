"use client";

import { cn } from "@/lib/utils";
import { DateInput, dateInputStyle } from "@/components/ui/datefield-rac";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import {
  Button,
  DateRangePicker,
  Dialog,
  Group,
  Label as AriaLabel,
  Popover,
} from "react-aria-components";
import { RangeCalendar } from "../ui/calendar-rac";
import { parseDate } from "@internationalized/date";
import { useMemo } from "react";
import type { RangeValue } from "react-aria-components";
import type { CalendarDate } from "@internationalized/date";

export type DateRangeValue = { start: string; end: string };

type WeekPickerProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  occupiedDateKeys?: string[];
  compact?: boolean;
  className?: string;
};

export function getDefaultDateRange(occupiedDateKeys: string[] = []): DateRangeValue {
  const today = new Date();
  const occupiedSet = new Set(occupiedDateKeys);

  // Keep previous behavior when no occupied dates exist: 4 calendar days (inclusive).
  if (occupiedSet.size === 0) {
    const nextWindowEnd = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    return {
      start: toDateInputValue(today),
      end: toDateInputValue(nextWindowEnd),
    };
  }

  // Otherwise pick the first available contiguous 4-day window (inclusive).
  const candidateStart = new Date(today);
  const maxLookaheadDays = 3650; // 10 years safeguard
  for (let i = 0; i < maxLookaheadDays; i++) {
    const start = new Date(candidateStart);
    start.setDate(candidateStart.getDate() + i);
    const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);

    let blocked = false;
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      if (occupiedSet.has(toDateInputValue(day))) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      return {
        start: toDateInputValue(start),
        end: toDateInputValue(end),
      };
    }
  }

  // Fallback to today window if no free range found.
  const nextWindowEnd = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  return {
    start: toDateInputValue(today),
    end: toDateInputValue(nextWindowEnd),
  };
}

  function toDateInputValue(d: Date): string {
    return d.toLocaleDateString("en-CA");
  }

export function WeekPicker({
  value,
  onChange,
  occupiedDateKeys = [],
  compact = false,
  className,
}: WeekPickerProps) {
    
    //parse the field.value from the form to a RangeValue<CalendarDate>
  const rangeValue: RangeValue<CalendarDate> | undefined =
    value?.start && value?.end
      ? { start: parseDate(value.start), end: parseDate(value.end) }
      : undefined;
  const hasSelectedRange = Boolean(value?.start && value?.end);

  const occupiedSet = useMemo(() => new Set(occupiedDateKeys), [occupiedDateKeys]);


  return (
    <DateRangePicker
      value={rangeValue}
      isDateUnavailable={(date) => occupiedSet.has(date.toString())}
      onChange={(range) => {
        if (range) {
          onChange({
            start: range.start.toString(),
            end: range.end.toString(),
          });
        }
      }}
      className={cn(compact ? "w-full" : "space-y-2", className)}
    >
      {/* Compact mode hides the visible label to match log selector layout. */}
      <AriaLabel className={compact ? "sr-only" : undefined}>
        <Label className="pb-1">Plan for</Label>
      </AriaLabel>
      <div className="flex">
        <Group className={cn(dateInputStyle, "relative w-full min-w-0 pe-9")}>
          {!hasSelectedRange ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              Select dates
            </span>
          ) : null}
          {/* Allow each side of the range to shrink and clip on narrow mobile widths. */}
          <DateInput
            slot="start"
            unstyled
            className={cn("shrink-0", !hasSelectedRange && "opacity-0")}
          />
          <span
            aria-hidden="true"
            className={cn("px-2 text-muted-foreground/70", !hasSelectedRange && "opacity-0")}
          >
            -
          </span>
          <DateInput
            slot="end"
            unstyled
            className={cn(
              "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
              !hasSelectedRange && "opacity-0",
            )}
          />
        </Group>
        <Button className="z-10 -me-px -ms-9 flex w-9 items-center justify-center rounded-e-lg text-muted-foreground opacity-50 outline-offset-2 transition-colors hover:text-foreground hover:opacity-100 focus-visible:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70">
          <CalendarIcon size={16} strokeWidth={2} />
        </Button>
      </div>
      <Popover
        className="z-50 rounded-lg border border-border bg-background text-popover-foreground shadow-lg shadow-black/5 outline-none data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2"
        offset={4}
      >
        <Dialog className="p-2">
          <RangeCalendar isDateUnavailable={(date) => occupiedSet.has(date.toString())} />
        </Dialog>
      </Popover>
    </DateRangePicker>
  );
}
