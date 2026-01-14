import { Prisma } from "@/src/generated/client";

export type RecipeType = Prisma.RecipeGetPayload<{
  include: {
    categories: {
      select: {
        id: true;
        slug: true;
        name: true;
      };
    };
    ingredients: {
      include: {
        ingredient: {
          include: {
            unitConversions: true; 
          };
        };
        unit: true;
      };
    };
  };
}>;