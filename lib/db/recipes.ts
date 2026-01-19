import { InsertRecipeOutputType } from "../validations/recipe";
import { prisma } from "./index";
import type { RecipeType } from "@/types/recipe";

export async function getRecipes(): Promise<RecipeType[]> {
  return await prisma.recipe.findMany({
    include: {
      categories: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      ingredients: {
        include: {
          ingredient: {
            include: {
              unitConversions: true, 
            },
          },
          unit: true, 
        },
      },
      images: true,  
    },
    orderBy: {
      name: "asc",
    },
  });
}


export async function getRecipeBySlug(slug: string): Promise<RecipeType | null> {
  return await prisma.recipe.findUnique({
    where: {
      slug,
    },
    include: {
      categories: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      ingredients: {
        include: {
          ingredient: {
            include: {
              unitConversions: true,
            },
          },
          unit: true, 
        },
      },
      images: true, 
    },
  });
}

export async function getRecipesByCategories(
  categorySlugs: string[]
): Promise<RecipeType[]> {
  if (categorySlugs.length === 0) {
    return getRecipes();
  }

  return await prisma.recipe.findMany({
    where: {
      categories: {
        some: {
          slug: {
            in: categorySlugs,
          },
        },
      },
    },
    include: {
      categories: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
        },
      },
      ingredients: {
        include: {
          ingredient: {
            include: {
              unitConversions: true,
            },
          },
          unit: true,
        },
      },
      images: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createRecipe(data: InsertRecipeOutputType & { slug: string }) {
  const { categories, ingredients, images, ...recipeData } = data;
  
  return await prisma.recipe.create({
    data: {
      ...recipeData,
      categories: {
        connect: categories.map((categoryId) => ({ id: categoryId })),
      },
      ingredients: {
        create: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          amount: ing.amount,
          unitId: ing.unitId,
          excludeFromNutrition: ing.excludeFromNutrition,
          additionalInfo: ing.additionalInfo,
        })),
      },
      images: {
        create: images.map((img) => ({
          url: img.url,
          isCover: img.isCover,
        })),
      },
    },
    include: {
      categories: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      ingredients: {
        include: {
          ingredient: true,
          unit: true,
        },
      },
      images: true, 
    },
  });
}

export async function updateRecipe(
  recipeId: string,
  data: InsertRecipeOutputType & { slug: string }
) {
  const { categories, ingredients, images, ...recipeData } = data;
  
  return await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      ...recipeData,
      categories: {
        set: categories.map((categoryId) => ({ id: categoryId })),
      },
      ingredients: {
        deleteMany: {}, 
        create: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          amount: ing.amount,
          unitId: ing.unitId,
          excludeFromNutrition: ing.excludeFromNutrition, 
          additionalInfo: ing.additionalInfo,
        })),
      },
      images: {
        deleteMany: {},  
        create: images.map((img) => ({
          url: img.url,
          isCover: img.isCover,
        })),
      },
    },
    include: {
      categories: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      ingredients: {
        include: {
          ingredient: true,
          unit: true,
        },
      },
      images: true,
    },
  });
}