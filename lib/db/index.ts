import { PrismaClient } from "@/src/generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

function createPrismaClient() {
  return new PrismaClient({ adapter });
}

const existingPrisma = globalForPrisma.prisma;
const hasShoppingListDelegate =
  existingPrisma != null &&
  "shoppingList" in existingPrisma &&
  existingPrisma.shoppingList != null;
const hasIngredientListDelegate =
  existingPrisma != null &&
  "ingredientList" in existingPrisma &&
  existingPrisma.ingredientList != null;

// In dev, global singletons can survive schema/client regeneration.
// Recreate the client when expected delegates are missing.
export const prisma = hasShoppingListDelegate && hasIngredientListDelegate
  ? existingPrisma
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;