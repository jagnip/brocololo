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
    },
  });
}


export async function getRecipesByCategory(
  categorySlug: string
): Promise<RecipeType[]> {
  return await prisma.recipe.findMany({
    where: {
      categories: {
        some: {
          slug: categorySlug,
        },
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
    },
    orderBy: {
      name: "asc",
    },
  });
}


export async function createRecipe(data: InsertRecipeOutputType & { slug: string }) {
  const { categories, ...recipeData } = data;
  
  return await prisma.recipe.create({
    data: {
      ...recipeData,
      categories: {
        connect: categories.map((categoryId) => ({ id: categoryId })),
      },
    },
  });
}