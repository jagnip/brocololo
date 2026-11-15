"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";
import {
  adjustStoredMealLot,
  removeStoredMealQuantity,
} from "@/lib/db/storage";
import {
  adjustStoredMealLotSchema,
  removeStoredMealQuantitySchema,
} from "@/lib/validations/storage";

function invalidInputMessage(message: string) {
  return { type: "error" as const, message };
}

export async function adjustStoredMealLotAction(input: unknown) {
  const parsed = adjustStoredMealLotSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputMessage(parsed.error.issues[0]?.message ?? "Could not update Storage.");
  }
  const { id: userId } = await requireUser();
  const result = await adjustStoredMealLot(userId, parsed.data);
  if (result.type === "success") {
    revalidatePath(ROUTES.storage);
    return result;
  }
  if (result.type === "conflict") return invalidInputMessage("Storage changed elsewhere. Reload and try again.");
  if (result.type === "invalid_audience") return invalidInputMessage("Choose people from your household.");
  return invalidInputMessage("That stored meal was not found.");
}

export async function removeStoredMealQuantityAction(input: unknown) {
  const parsed = removeStoredMealQuantitySchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputMessage(parsed.error.issues[0]?.message ?? "Could not update Storage.");
  }
  const { id: userId } = await requireUser();
  const result = await removeStoredMealQuantity(userId, parsed.data);
  if (result.type === "success") {
    revalidatePath(ROUTES.storage);
    return result;
  }
  if (result.type === "conflict") return invalidInputMessage("Storage changed elsewhere. Reload and try again.");
  return invalidInputMessage("That stored meal was not found.");
}
