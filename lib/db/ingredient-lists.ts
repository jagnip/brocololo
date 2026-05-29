import { Prisma } from "@/src/generated/client";
import { prisma } from "@/lib/db/index";

const ingredientListInclude = {
  items: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      ingredient: {
        include: {
          category: {
            select: { id: true, name: true, slug: true, sortOrder: true },
          },
        },
      },
    },
  },
} as const satisfies Prisma.IngredientListInclude;

export type IngredientListWithItems = Prisma.IngredientListGetPayload<{
  include: typeof ingredientListInclude;
}>;

export async function getIngredientLists(
  userId: string,
): Promise<IngredientListWithItems[]> {
  return prisma.ingredientList.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: ingredientListInclude,
  });
}

export async function createIngredientList(input: {
  userId: string;
  name: string;
}) {
  return prisma.ingredientList.create({
    data: { userId: input.userId, name: input.name },
    include: ingredientListInclude,
  });
}

export async function renameIngredientList(input: {
  userId: string;
  id: string;
  name: string;
}) {
  const owned = await prisma.ingredientList.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("INGREDIENT_LIST_NOT_FOUND");
  }
  return prisma.ingredientList.update({
    where: { id: input.id },
    data: { name: input.name },
    include: ingredientListInclude,
  });
}

export async function deleteIngredientList(input: { userId: string; id: string }) {
  const owned = await prisma.ingredientList.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("INGREDIENT_LIST_NOT_FOUND");
  }
  return prisma.ingredientList.delete({
    where: { id: input.id },
    select: { id: true },
  });
}

export async function addIngredientToList(input: {
  userId: string;
  listId: string;
  ingredientId: string;
}) {
  const owned = await prisma.ingredientList.findFirst({
    where: { id: input.listId, userId: input.userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("INGREDIENT_LIST_NOT_FOUND");
  }

  try {
    return await prisma.ingredientListItem.create({
      data: {
        listId: input.listId,
        ingredientId: input.ingredientId,
      },
      include: {
        ingredient: {
          include: {
            category: {
              select: { id: true, name: true, slug: true, sortOrder: true },
            },
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.ingredientListItem.findUniqueOrThrow({
        where: {
          listId_ingredientId: {
            listId: input.listId,
            ingredientId: input.ingredientId,
          },
        },
        include: {
          ingredient: {
            include: {
              category: {
                select: { id: true, name: true, slug: true, sortOrder: true },
              },
            },
          },
        },
      });
    }
    throw error;
  }
}

export async function removeIngredientFromList(input: {
  userId: string;
  listId: string;
  ingredientId: string;
}) {
  const owned = await prisma.ingredientList.findFirst({
    where: { id: input.listId, userId: input.userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("INGREDIENT_LIST_NOT_FOUND");
  }

  await prisma.ingredientListItem.deleteMany({
    where: { listId: input.listId, ingredientId: input.ingredientId },
  });
}
