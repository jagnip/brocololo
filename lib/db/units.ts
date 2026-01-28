import { prisma } from "./index";

export async function getUnits() {
  return await prisma.unit.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function createUnit(input: { name: string; namePlural?: string }) {
  return await prisma.unit.create({
    data: {
      // Persist already-normalized validation output.
      name: input.name,
      // Persist null when optional plural form is not provided.
      namePlural: input.namePlural ?? null,
    },
  });
}

export async function getUnitById(unitId: string) {
  return await prisma.unit.findUnique({
    where: { id: unitId },
  });
}

export async function renameUnit(input: {
  unitId: string;
  name: string;
  namePlural?: string;
}) {
  const duplicate = await prisma.unit.findFirst({
    where: {
      id: { not: input.unitId },
      name: {
        equals: input.name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("DUPLICATE_UNIT_NAME");
  }

  return await prisma.unit.update({
    where: { id: input.unitId },
    data: {
      // Persist normalized, validated unit name.
      name: input.name,
      // Keep plural optional to avoid forcing abbreviations like "g"/"ml".
      namePlural: input.namePlural ?? null,
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