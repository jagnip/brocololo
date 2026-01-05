import { prisma } from "./index";
import type { RecipeType } from "@/types/recipe";

export async function getRecipes(): Promise<RecipeType[]> {
  return await prisma.recipe.findMany({
    include: {
      categories: {
        select: {
          slug: true,
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
          slug: true,
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
          slug: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}