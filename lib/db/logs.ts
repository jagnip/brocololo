import { LogPerson } from "@/src/generated/client";
import { prisma } from "./index";

export async function getLogs() {
  return prisma.log.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      plan: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });
}

export async function getLogById(logId: string, person: LogPerson) {
  return prisma.log.findUnique({
    where: { id: logId },
    select: {
      id: true,
      createdAt: true,
      plan: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
        },
      },
      entries: {
        where: { person },
        orderBy: [{ date: "asc" }, { mealType: "asc" }],
        select: {
          id: true,
          date: true,
          mealType: true,
          person: true,
          recipes: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              sourceRecipe: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          ingredients: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              amount: true,
              ingredient: {
                select: {
                  id: true,
                  name: true,
                },
              },
              unit: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
