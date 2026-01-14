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
    },
  });
}


export async function createRecipe(data: InsertRecipeOutputType & { slug: string }) {
  const { categories, ingredients, ...recipeData } = data;
  
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
    },
  });
}

export async function updateRecipe(
  recipeId: string,
  data: InsertRecipeOutputType & { slug: string }
) {
  const { categories, ingredients, ...recipeData } = data;
  
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
    },
  });
}