import { Prisma } from "@/src/generated/client";

export type IngredientType = Prisma.IngredientGetPayload<{
  include: {
    unitConversions: {
      include: {
        unit: true;
      };
    };
  };
}>;