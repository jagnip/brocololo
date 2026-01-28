import { z } from "zod";

const optionalUnitPluralSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    // Normalize empty optional input to undefined for consistent persistence.
    if (!value || value.length === 0) {
      return undefined;
    }
    return value;
  });

export const createUnitSchema = z.object({
  // Trim user input so " cup " and "cup" are treated consistently.
  name: z.string().trim().min(1, { message: "Unit name is required" }),
  // Plural form is optional and only needed for irregular labels.
  namePlural: optionalUnitPluralSchema,
});

export type CreateUnitValues = z.infer<typeof createUnitSchema>;

export const renameUnitSchema = createUnitSchema.extend({
  // Keep unit identity explicit for update actions.
  unitId: z.string().min(1, { message: "Unit id is required" }),
});

export type RenameUnitValues = z.infer<typeof renameUnitSchema>;
