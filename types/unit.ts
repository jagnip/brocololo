import { Prisma } from "@/src/generated/client";

export type UnitType = Prisma.UnitGetPayload<Prisma.UnitDefaultArgs>;

export type IngredientUnitType = Prisma.IngredientUnitGetPayload<{
  include: {
    unit: true;
  };
}>;
