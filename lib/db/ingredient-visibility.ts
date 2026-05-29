import type { Prisma } from "@/src/generated/client";

/** Seed catalog (userId null) plus the signed-in user's custom ingredients. */
export function ingredientVisibilityWhere(userId: string): Prisma.IngredientWhereInput {
  return { OR: [{ userId: null }, { userId }] };
}
