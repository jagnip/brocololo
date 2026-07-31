/** Shared hands-on time filter options for recipes list and meal picker. */
export const TIME_OPTIONS = [
  // Query params are strings; numeric-like strings keep URL and parsing simple.
  { value: "20", label: "Below 20 min" },
  { value: "30", label: "Below 30 min" },
] as const;
