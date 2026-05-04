import { Prisma } from "@/src/generated/client";

export type IngredientType = Prisma.IngredientGetPayload<{
  include: {
    category: true;
    unitConversions: {
      include: {
        unit: true;
      };
    };
  };
}>;