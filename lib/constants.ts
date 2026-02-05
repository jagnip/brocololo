import { MealType } from "@/src/generated/enums";

export const FLAVOUR_BREADCRUMB_LABELS: Record<string, string> = {
  sweet: "Sweet",
  savoury: "Savoury",
};

export const MEAL_TYPES: MealType[] = [
  MealType.BREAKFAST,
  MealType.LUNCH,
  MealType.DINNER,
];