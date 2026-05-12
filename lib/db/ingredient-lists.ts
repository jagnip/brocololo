import { Prisma } from "@/src/generated/client";
import { prisma } from "@/lib/db/index";

// Selects ingredients-with-category for the right-panel rendering. Hoisted into
// a const so the GET helper and the consumer types stay aligned.
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

/**
 * Returns every ingredient list with its items, ingredient + ingredient
 * category eagerly loaded. Lists are sorted by createdAt ASC so the order in
 * the switcher feels stable across page loads. Items inside each list are
 * sorted by `position` then `createdAt` (newest-last fallback when positions
 * tie or are all default 0).
 */
export async function getIngredientLists(): Promise<IngredientListWithItems[]> {
  return prisma.ingredientList.findMany({
    orderBy: { createdAt: "asc" },
    include: ingredientListInclude,
  });
}

export async function createIngredientList(input: { name: string }) {
  return prisma.ingredientList.create({
    data: { name: input.name },
    include: ingredientListInclude,
  });
}

export async function renameIngredientList(input: { id: string; name: string }) {
  return prisma.ingredientList.update({
    where: { id: input.id },
    data: { name: input.name },
    include: ingredientListInclude,
  });
}

export async function deleteIngredientList(input: { id: string }) {
  return prisma.ingredientList.delete({
    where: { id: input.id },
    select: { id: true },
  });
}

/**
 * Adds an ingredient to a list. Idempotent: if the (listId, ingredientId)
 * row already exists, the duplicate-key error is swallowed so the caller
 * never has to special-case it. Returns the (created or pre-existing) item.
 */
export async function addIngredientToList(input: {
  listId: string;
  ingredientId: string;
}) {
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
      // Already in the list — return the existing row so callers can treat
      // create + ensure-exists with the same code path.
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
  listId: string;
  ingredientId: string;
}) {
  // deleteMany is used instead of delete so the call is idempotent: removing
  // an already-missing pair returns count: 0 rather than throwing P2025.
  await prisma.ingredientListItem.deleteMany({
    where: { listId: input.listId, ingredientId: input.ingredientId },
  });
}
