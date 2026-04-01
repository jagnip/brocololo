import { LogMealType } from "@/src/generated/enums";

type LogIngredientRow = {
  entryRecipeId: string | null;
  amount: number | null;
  unit: { id: string; name: string } | null;
  ingredient: {
    id: string;
    name: string;
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
    unitConversions: Array<{
      unitId: string;
      gramsPerUnit: number;
    }>;
  } | null;
};

type LogRecipeRow = {
  id: string;
  /** Set when this row came from dragging a planner-pool card (reserves a plan slot). */
  planSlotId?: string | null;
  sourceRecipe:
    | {
        id: string;
        name: string | null;
        slug: string | null;
        images: Array<{ url: string }>;
      }
    | null;
};

type LogEntryRow = {
  id: string;
  date: Date;
  mealType: LogMealType;
  recipes: LogRecipeRow[];
  ingredients: LogIngredientRow[];
};

export type LogRecipeCardData = {
  id: string;
  entryId?: string;
  entryRecipeId: string | null;
  sourceRecipeId: string | null;
  mealLabel: LogSlotData["label"];
  cardKind: "recipe" | "custom" | "removed";
  title: string;
  slug: string | null;
  imageUrl: string | null;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  ingredients?: Array<{
    ingredientId: string | null;
    ingredientName: string | null;
    unitId: string | null;
    unitName: string | null;
    amount: number | null;
  }>;
};

export type LogSlotData = {
  entryId?: string;
  mealType: LogMealType;
  label: "Breakfast" | "Lunch" | "Snack" | "Dinner";
  recipes: LogRecipeCardData[];
};

export type LogDayData = {
  date: Date;
  dateKey: string;
  slots: LogSlotData[];
};

export type PlannerPoolCardData = {
  id: string;
  date: Date;
  dateKey: string;
  mealType: LogMealType;
  mealLabel: LogSlotData["label"];
  title: string;
  sourceRecipeId: string | null;
  imageUrl: string | null;
  ingredients: Array<{
    ingredientId: string;
    unitId: string;
    amount: number;
  }>;
};

export type PlannerPoolGroupedCardData = PlannerPoolCardData & {
  count: number;
};

export const LOG_MEAL_ORDER: LogMealType[] = [
  LogMealType.BREAKFAST,
  LogMealType.LUNCH,
  LogMealType.SNACK,
  LogMealType.DINNER,
];

const LOG_MEAL_LABELS: Record<LogMealType, LogSlotData["label"]> = {
  [LogMealType.BREAKFAST]: "Breakfast",
  [LogMealType.LUNCH]: "Lunch",
  [LogMealType.SNACK]: "Snack",
  [LogMealType.DINNER]: "Dinner",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toRecipeMacros(ingredients: LogIngredientRow[]): {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
} {
  let calories = 0;
  let proteins = 0;
  let fats = 0;
  let carbs = 0;

  for (const row of ingredients) {
    if (row.amount == null || row.ingredient == null || row.unit == null) continue;

    const conversion = row.ingredient.unitConversions.find(
      (unitConversion) => unitConversion.unitId === row.unit!.id,
    );
    if (!conversion) continue;

    const grams = row.amount * conversion.gramsPerUnit;
    const nutrientMultiplier = grams / 100;
    calories += row.ingredient.calories * nutrientMultiplier;
    proteins += row.ingredient.proteins * nutrientMultiplier;
    fats += row.ingredient.fats * nutrientMultiplier;
    carbs += row.ingredient.carbs * nutrientMultiplier;
  }

  return {
    calories: round1(calories),
    proteins: round1(proteins),
    fats: round1(fats),
    carbs: round1(carbs),
  };
}

function createEmptySlots(): Record<LogMealType, LogSlotData> {
  return {
    [LogMealType.BREAKFAST]: {
      entryId: undefined,
      mealType: LogMealType.BREAKFAST,
      label: LOG_MEAL_LABELS[LogMealType.BREAKFAST],
      recipes: [],
    },
    [LogMealType.LUNCH]: {
      entryId: undefined,
      mealType: LogMealType.LUNCH,
      label: LOG_MEAL_LABELS[LogMealType.LUNCH],
      recipes: [],
    },
    [LogMealType.SNACK]: {
      entryId: undefined,
      mealType: LogMealType.SNACK,
      label: LOG_MEAL_LABELS[LogMealType.SNACK],
      recipes: [],
    },
    [LogMealType.DINNER]: {
      entryId: undefined,
      mealType: LogMealType.DINNER,
      label: LOG_MEAL_LABELS[LogMealType.DINNER],
      recipes: [],
    },
  };
}

export function buildLogDays(entries: LogEntryRow[]): LogDayData[] {
  const byDay = new Map<
    string,
    {
      date: Date;
      slots: Record<LogMealType, LogSlotData>;
    }
  >();

  for (const entry of entries) {
    const dateKey = entry.date.toISOString().slice(0, 10);
    const day = byDay.get(dateKey) ?? {
      date: entry.date,
      slots: createEmptySlots(),
    };

    const recipeCards: LogRecipeCardData[] = entry.recipes.map((recipe) => {
      const linkedIngredients = entry.ingredients.filter(
        (ingredient) => ingredient.entryRecipeId === recipe.id,
      );
      const macros = toRecipeMacros(linkedIngredients);

      return {
        id: recipe.id,
        entryId: entry.id,
        entryRecipeId: recipe.id,
        sourceRecipeId: recipe.sourceRecipe?.id ?? null,
        mealLabel: LOG_MEAL_LABELS[entry.mealType],
        cardKind: recipe.sourceRecipe ? "recipe" : "removed",
        title: recipe.sourceRecipe?.name ?? "Recipe removed",
        slug: recipe.sourceRecipe?.slug ?? null,
        imageUrl: recipe.sourceRecipe?.images?.[0]?.url ?? null,
        ...macros,
        ingredients: linkedIngredients.map((ingredient) => ({
          ingredientId: ingredient.ingredient?.id ?? null,
          ingredientName: ingredient.ingredient?.name ?? null,
          unitId: ingredient.unit?.id ?? null,
          unitName: ingredient.unit?.name ?? null,
          amount: ingredient.amount ?? null,
        })),
      };
    });

    const customIngredients = entry.ingredients.filter(
      (ingredient) => ingredient.entryRecipeId == null,
    );
    if (customIngredients.length > 0) {
      const customMacros = toRecipeMacros(customIngredients);
      recipeCards.unshift({
        id: `custom-${entry.id}`,
        entryId: entry.id,
        entryRecipeId: null,
        sourceRecipeId: null,
        mealLabel: LOG_MEAL_LABELS[entry.mealType],
        cardKind: "custom",
        title: `Custom ${LOG_MEAL_LABELS[entry.mealType].toLowerCase()}`,
        slug: null,
        imageUrl: null,
        ...customMacros,
        ingredients: customIngredients.map((ingredient) => ({
          ingredientId: ingredient.ingredient?.id ?? null,
          ingredientName: ingredient.ingredient?.name ?? null,
          unitId: ingredient.unit?.id ?? null,
          unitName: ingredient.unit?.name ?? null,
          amount: ingredient.amount ?? null,
        })),
      });
    }

    day.slots[entry.mealType] = {
      entryId: entry.id,
      mealType: entry.mealType,
      label: LOG_MEAL_LABELS[entry.mealType],
      recipes: recipeCards,
    };

    byDay.set(dateKey, day);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, day]) => ({
      date: day.date,
      dateKey,
      slots: LOG_MEAL_ORDER.map((mealType) => day.slots[mealType]),
    }));
}

function plannerPoolMatchKey(item: {
  sourceRecipeId: string | null;
}) {
  return item.sourceRecipeId ?? "none";
}

export function buildVisiblePlannerPoolCards(params: {
  items: PlannerPoolCardData[];
  entries: LogEntryRow[];
}): PlannerPoolCardData[] {
  const { items } = params;
  // Source of truth is planner slot `used` state (pool query already returns unused slots only).
  // Do not subtract by log placements here, otherwise one placement hides two duplicate lines.
  return items;
}

export function buildGroupedPlannerPoolCards(
  items: PlannerPoolCardData[],
): PlannerPoolGroupedCardData[] {
  const grouped = new Map<string, PlannerPoolGroupedCardData>();

  for (const item of items) {
    const key = item.sourceRecipeId ?? `fallback-${item.id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    grouped.set(key, {
      ...item,
      count: 1,
    });
  }

  const groupedValues = Array.from(grouped.values());
  return groupedValues;
}
