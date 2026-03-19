"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import { updateLogRecipeIngredients } from "@/lib/db/logs";
import {
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
