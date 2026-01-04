import { prisma } from "./index";
import type { Category } from "@/src/generated/client";

export async function getCategories(): Promise<Category[]> {
  return await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
}
