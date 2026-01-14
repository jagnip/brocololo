import { prisma } from "./index";

export async function getUnits() {
  return await prisma.unit.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getIngredientUnits(ingredientId: string) {
  return await prisma.ingredientUnit.findMany({
    where: {
      ingredientId,
    },
    include: {
      unit: true,
    },
    orderBy: {
      unit: {
        name: "asc",
      },
    },
  });
}