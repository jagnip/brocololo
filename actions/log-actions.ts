"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import {
  replaceMealSlotWithRecipe,
  updateLogRecipeIngredients,
  upsertLogSlot,
} from "@/lib/db/logs";
import {
  addRecipeToLogSchema,
  type AddRecipeToLogInput,
  upsertLogSlotSchema,
  type UpsertLogSlotInput,
  updateLogRecipeIngredientsSchema,
  type UpdateLogRecipeIngredientsInput,
} from "@/lib/validations/log";

export async function updateLogRecipeIngredientsAction(
  input: UpdateLogRecipeIngredientsInput,
) {
  const parsed = updateLogRecipeIngredientsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error" as const,
      message: parsed.error.issues[0]?.message ?? "Invalid ingredient data",
    };
  }

  try {
    await updateLogRecipeIngredients(parsed.data);
  } catch (error) {
    console.error("Error updating log recipe ingredients", error);
    return {
      type: "error" as const,
      message: "Failed to update ingredients for this recipe",
    };
  }

  revalidatePath(ROUTES.logView(parsed.data.logId));
  return { type: "success" as const };
}

export async function addRecipeToLogAction(input: AddRecipeToLogInput) {
  const parsed = addRecipeToLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error" as const,
      message: parsed.error.issues[0]?.message ?? "Invalid log data",
    };
  }

  try {
    const { logId } = await replaceMealSlotWithRecipe(parsed.data);
    revalidatePath(ROUTES.logView(logId));
  } catch (error) {
    console.error("Error adding recipe to log", error);
    return {
      type: "error" as const,
      message: "Failed to add recipe to log",
    };
  }

  return { type: "success" as const };
}

export async function upsertLogSlotAction(input: UpsertLogSlotInput) {
  const parsed = upsertLogSlotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error" as const,
      message: parsed.error.issues[0]?.message ?? "Invalid slot data",
    };
  }

  try {
    await upsertLogSlot(parsed.data);
  } catch (error) {
    console.error("Error updating log slot", error);
    return {
      type: "error" as const,
      message: "Failed to update log slot",
    };
  }

  revalidatePath(ROUTES.logView(parsed.data.logId));
  return { type: "success" as const };
}
