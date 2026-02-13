import type { RecipeType } from "@/types/recipe";
import { MealType, Prisma } from "@/src/generated/client";

export type DayMealsType = {
  date: Date;
  breakfast: SlotInputType;
  lunch: SlotInputType;
  dinner: SlotInputType;
};

//Input Types
export type SlotInputType = {
  date: Date;
  mealType: MealType;
  recipe: RecipeType;
  alternatives: RecipeType[]; // top candidates in score order for shuffle
};


export type PlanInputType = SlotInputType[];
// export type SlotInputType = Pick<PlanSlotType, "date" | "mealType" | "recipeId">;

//DB
// export type PlanSlotType = Prisma.PlanSlotGetPayload<{}>;
// export type PlanType = Prisma.PlanGetPayload<{}>;


   