import { Prisma } from "@/src/generated/client";

export type RecipeType = Prisma.RecipeGetPayload<{
  include: {
    categories: {
      select: {
        slug: true;
      };
    };
  };
}>;