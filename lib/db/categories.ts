import { prisma } from "./index";
import type { Category } from "@/src/generated/client";

export async function getCategories(): Promise<Category[]> {
  return await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getCategoriesByType(
  type: "FLAVOUR" | "RECIPE_TYPE" | "PROTEIN"
): Promise<Category[]> {
  return await prisma.category.findMany({
    where: {
      type,
    },
    orderBy: {
      name: "asc",
    },
  });
}