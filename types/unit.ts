import { Prisma } from "@/src/generated/client";

export type UnitType = Prisma.UnitGetPayload<{}>;

export type IngredientUnitType = Prisma.IngredientUnitGetPayload<{
  include: {
    unit: true;
  };
}>;