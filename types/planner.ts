import type { RecipeType } from "@/types/recipe";
import { Prisma } from "@/src/generated/client";

export type PlanDayType = {
  date: Date;
  breakfast: RecipeType;
  lunch: RecipeType;
  dinner: RecipeType;
};

export type PlanDaysType = PlanDayType[];

export type PlanSlotType = Prisma.PlanSlotGetPayload<{}>;

export type PlanType = Prisma.PlanGetPayload<{}>;

export type SlotInputType = Pick<PlanSlotType, "date" | "mealType" | "recipeId">;

