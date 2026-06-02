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
