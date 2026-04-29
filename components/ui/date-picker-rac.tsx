"use client";

import { parseDate } from "@internationalized/date";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar-rac";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

type DatePickerProps = {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  availableDateKeys?: string[];
};

function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick a date",
  className,
  availableDateKeys,
}: DatePickerProps) {
  const calendarValue = toCalendarDateOrNull(value);
  const availableDateKeySet = availableDateKeys
    ? new Set(availableDateKeys)
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            // Keep trigger horizontal padding aligned with Input/Select defaults.
            "w-full justify-between px-3 text-left font-normal",
            !calendarValue && "text-muted-foreground",
            className,
          )}
        >
          {calendarValue ? format(isoDateToLocalDate(value), "PPP") : placeholder}
          {/* Keep calendar affordance on the trailing edge for scanability. */}
          <CalendarIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      {/* shadcn-style popover + calendar composition for single-date picking. */}
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          value={calendarValue ?? undefined}
          // When provided, allow choosing only dates explicitly listed by caller.
          isDateUnavailable={
            availableDateKeySet
              ? (date) => !availableDateKeySet.has(date.toString())
              : undefined
          }
          onChange={(nextValue) => {
            onChange(nextValue.toString());
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function toCalendarDateOrNull(value: string) {
  if (!value) {
    return null;
  }
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function isoDateToLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export { DatePicker };
