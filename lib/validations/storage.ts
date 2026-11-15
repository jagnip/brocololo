import { z } from "zod";

const audienceMemberIdsSchema = z
  .array(z.string().min(1))
  .min(1, "Choose at least one person")
  .transform((ids) => [...new Set(ids)]);

export const adjustStoredMealLotSchema = z.object({
  lotId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  count: z.number().int().min(0).max(99),
  cookingFamilyMemberIds: audienceMemberIdsSchema,
});

export const removeStoredMealQuantitySchema = z.object({
  lotId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  reason: z.enum(["USED", "DISCARDED"]),
});

export type AdjustStoredMealLotInput = z.infer<typeof adjustStoredMealLotSchema>;
export type RemoveStoredMealQuantityInput = z.infer<typeof removeStoredMealQuantitySchema>;
