/** Shared label for log and plan date-range selectors (e.g. "Jan 3 - Jan 9"). */
export function formatDateRangeLabel(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}
