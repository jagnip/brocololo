import { prisma } from "./index";

export async function getIngredients() {
  return await prisma.ingredient.findMany({
    orderBy: {
      name: "asc",
    },
  });
}