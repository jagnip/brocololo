import { prisma } from "./index";

export async function getIngredients() {
  return await prisma.ingredient.findMany({
    include: {
      unitConversions: {
        include: { unit: true },
        orderBy: { unit: { symbol: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });
}
