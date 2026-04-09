"use client";

import { cn } from "@/lib/utils";
import { DateInput, dateInputStyle } from "@/components/ui/datefield-rac";
import { CalendarIcon } from "lucide-react";
import {
  Button,
  DateRangePicker,
  Dialog,
  Group,
  Label,
  Popover,
} from "react-aria-components";
import { RangeCalendar } from "../ui/calendar-rac";
import { parseDate } from "@internationalized/date";
import type { RangeValue } from "react-aria-components";
import type { CalendarDate } from "@internationalized/date";

export type DateRangeValue = { start: string; end: string };

type WeekPickerProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  compact?: boolean;
  className?: string;
};

export function getDefaultDateRange(): DateRangeValue {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    start: toDateInputValue(today),
    end: toDateInputValue(nextWeek),
  };
}

  function toDateInputValue(d: Date): string {
    return d.toLocaleDateString("en-CA");
  }

export function WeekPicker({ value, onChange, compact = false, className }: WeekPickerProps) {
    
    //parse the field.value from the form to a RangeValue<CalendarDate>
  const rangeValue: RangeValue<CalendarDate> | undefined =
    value?.start && value?.end
      ? { start: parseDate(value.start), end: parseDate(value.end) }
      : undefined;


  return (
    <DateRangePicker
      value={rangeValue}
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
      <Label className={cn("text-sm font-medium text-foreground", compact && "sr-only")}>
        Plan for
      </Label>
      <div className="flex">
        <Group className={cn(dateInputStyle, "w-full min-w-0 pe-9")}>
          {/* Allow each side of the range to shrink and clip on narrow mobile widths. */}
          <DateInput
            slot="start"
            unstyled
            className="shrink-0"
          />
          <span aria-hidden="true" className="px-2 text-muted-foreground/70">
            -
          </span>
          <DateInput
            slot="end"
            unstyled
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
          />
        </Group>
        <Button className="z-10 -me-px -ms-9 flex w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70">
          <CalendarIcon size={16} strokeWidth={2} />
        </Button>
      </div>
      <Popover
        className="z-50 rounded-lg border border-border bg-background text-popover-foreground shadow-lg shadow-black/5 outline-none data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2"
        offset={4}
      >
        <Dialog className="max-h-[inherit] overflow-auto p-2">
          <RangeCalendar />
        </Dialog>
      </Popover>
    </DateRangePicker>
  );
}
