import { z } from "zod";
import { FAMILY_MEMBERS_MAX_PER_USER } from "@/lib/constants";

const NAME_MAX = 40;

export const familyMemberNameSchema = z
  .string()
  .trim()
  .max(NAME_MAX, {
    message: `Keep the name under ${NAME_MAX} characters.`,
  });

const memberIdSchema = z.string().min(1);

export const updateFamilyMemberNameSchema = z.object({
  id: memberIdSchema,
  name: familyMemberNameSchema,
});

/** Household default portion multiplier — same options as the old recipe form. */
export const updateFamilyMemberPortionMultiplierSchema = z.object({
  id: memberIdSchema,
  portionMultiplier: z
    .number()
    .min(1)
    .refine((value) => Math.abs(value * 2 - Math.round(value * 2)) < 1e-9, {
      message: "Choose a multiplier in 0.5 steps",
    }),
});

export const createFamilyMemberSchema = z.object({
  name: familyMemberNameSchema.optional().default(""),
});

export const deleteFamilyMemberSchema = z.object({
  id: memberIdSchema,
});

export const familyMemberCountGuardSchema = z
  .number()
  .int()
  .max(FAMILY_MEMBERS_MAX_PER_USER, {
    message: "Too many family members.",
  });
