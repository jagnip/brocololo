import { InsertRecipeOutputType } from "../validations/recipe";
import { prisma } from "./index";
import type { RecipeType } from "@/types/recipe";

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
  });
}

export async function getRecipes(
  categorySlugs: string[],
  q?: string
): Promise<RecipeType[]> {

  return prisma.recipe.findMany({
    where: {
      ...(categorySlugs.length > 0 ? { categories: { some: { slug: { in: categorySlugs } } } } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
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
      handsOnTime: "asc",
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