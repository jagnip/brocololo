import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});