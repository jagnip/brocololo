import { Prisma } from "@/src/generated/client";

export type RecipeType = Prisma.RecipeGetPayload<{
  include: {
    categories: {
      select: {
        id: true;
        slug: true;
        name: true;
        type: true;
      };
    };
    ingredientGroups: {
      orderBy: {
        position: "asc";
      };
    };
    ingredients: {
      orderBy: [
        {
          position: "asc";
        },
        {
          id: "asc";
        },
      ];
      include: {
        group: true;
        ingredient: {
          include: {
            unitConversions: {
              include: {
                unit: {
                  select: {
                    id: true;
                    name: true;
                  };
                };
              };
            };
          };
        };
        unit: true;
      };
    };
    instructions: {
      orderBy: {
        position: "asc";
      };
      include: {
        ingredients: {
          include: {
            recipeIngredient: {
              include: {
                ingredient: {
                  include: {
                    unitConversions: {
                      include: {
                        unit: {
                          select: {
                            id: true;
                            name: true;
                          };
                        };
                      };
                    };
                  };
                };
                unit: true;
              };
            };
          };
        };
      };
    };
    images: true;
  };
}>;