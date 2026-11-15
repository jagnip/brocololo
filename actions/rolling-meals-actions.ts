"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";
import { adjustRollingMeal, discardRollingMealQuantity } from "@/lib/db/rolling-meals";
import { adjustRollingMealSchema, discardRollingMealQuantitySchema } from "@/lib/validations/rolling-meals";

export async function adjustRollingMealAction(input: unknown) {
  const parsed = adjustRollingMealSchema.safeParse(input);
  if (!parsed.success) return { type: "error" as const, message: parsed.error.issues[0]?.message ?? "Invalid queue adjustment." };
  const { id } = await requireUser();
  const result = await adjustRollingMeal(id, parsed.data);
  if (result.type === "success") revalidatePath(ROUTES.plan, "layout");
  return result;
}

export async function discardRollingMealQuantityAction(input: unknown) {
  const parsed = discardRollingMealQuantitySchema.safeParse(input);
  if (!parsed.success) return { type: "error" as const, message: parsed.error.issues[0]?.message ?? "Invalid discard quantity." };
  const { id } = await requireUser();
  const result = await discardRollingMealQuantity(id, parsed.data);
  if (result.type === "success") revalidatePath(ROUTES.plan, "layout");
  return result;
}
