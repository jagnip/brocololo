import { z } from "zod";

const identity = {
  entryId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
};

export const adjustRollingMealSchema = z.object({
  ...identity,
  count: z.number().int().min(0).max(99),
});

export const discardRollingMealQuantitySchema = z.object({
  ...identity,
  quantity: z.number().int().min(1).max(99),
});

export type AdjustRollingMealInput = z.infer<typeof adjustRollingMealSchema>;
export type DiscardRollingMealQuantityInput = z.infer<typeof discardRollingMealQuantitySchema>;
