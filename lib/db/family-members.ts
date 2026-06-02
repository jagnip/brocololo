import { prisma } from "@/lib/db/index";

/** Row shape returned to Settings UI and future Phase 2 surfaces. */
export type FamilyMemberRow = {
  id: string;
  name: string;
  isSelf: boolean;
  sortOrder: number;
};

const familyMemberSelect = {
  id: true,
  name: true,
  isSelf: true,
  sortOrder: true,
} as const;

// Phase 2: map isSelf member → LogPerson.PRIMARY; first non-self by sortOrder → SECONDARY
// until LogEntry uses familyMemberId.

export async function listFamilyMembers(
  userId: string,
): Promise<FamilyMemberRow[]> {
  return prisma.familyMember.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    select: familyMemberSelect,
  });
}

/**
 * Guarantees exactly one self row for the account holder.
 * Creates an empty self row when the household has no members yet.
 */
export async function ensureSelfFamilyMember(
  userId: string,
): Promise<FamilyMemberRow[]> {
  const existing = await listFamilyMembers(userId);
  const selfRow = existing.find((member) => member.isSelf);
  if (selfRow) {
    return existing;
  }

  if (existing.length > 0) {
    const promoted = existing.reduce((lowest, member) =>
      member.sortOrder < lowest.sortOrder ? member : lowest,
    );
    await prisma.familyMember.update({
      where: { id: promoted.id },
      data: { isSelf: true, sortOrder: 0 },
    });
    const others = existing
      .filter((member) => member.id !== promoted.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    for (let index = 0; index < others.length; index++) {
      await prisma.familyMember.update({
        where: { id: others[index]!.id },
        data: { sortOrder: index + 1 },
      });
    }
    return listFamilyMembers(userId);
  }

  await prisma.familyMember.create({
    data: {
      userId,
      name: "",
      isSelf: true,
      sortOrder: 0,
    },
  });
  return listFamilyMembers(userId);
}

export async function updateFamilyMemberName(input: {
  userId: string;
  id: string;
  name: string;
}): Promise<FamilyMemberRow> {
  const owned = await prisma.familyMember.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("FAMILY_MEMBER_NOT_FOUND");
  }

  return prisma.familyMember.update({
    where: { id: input.id },
    data: { name: input.name },
    select: familyMemberSelect,
  });
}

export async function createFamilyMember(input: {
  userId: string;
  name: string;
}): Promise<FamilyMemberRow> {
  const aggregate = await prisma.familyMember.aggregate({
    where: { userId: input.userId },
    _max: { sortOrder: true },
  });
  const nextSortOrder = (aggregate._max.sortOrder ?? -1) + 1;

  return prisma.familyMember.create({
    data: {
      userId: input.userId,
      name: input.name,
      isSelf: false,
      sortOrder: nextSortOrder,
    },
    select: familyMemberSelect,
  });
}

export async function deleteFamilyMember(input: {
  userId: string;
  id: string;
}): Promise<void> {
  const owned = await prisma.familyMember.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true, isSelf: true },
  });
  if (!owned) {
    throw new Error("FAMILY_MEMBER_NOT_FOUND");
  }
  if (owned.isSelf) {
    throw new Error("CANNOT_DELETE_SELF_MEMBER");
  }

  await prisma.familyMember.delete({ where: { id: input.id } });
}

export type FamilyMemberRecipeImpact = {
  hasRecipeImpact: boolean;
};

export async function getFamilyMemberRecipeImpact(input: {
  userId: string;
  id: string;
}): Promise<FamilyMemberRecipeImpact> {
  const owned = await prisma.familyMember.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true },
  });
  if (!owned) {
    throw new Error("FAMILY_MEMBER_NOT_FOUND");
  }

  const [audienceRows, portionRows, ingredientTargetRows] = await Promise.all([
    prisma.recipeAudienceMember.count({
      where: {
        familyMemberId: input.id,
        recipe: { userId: input.userId },
      },
    }),
    prisma.recipeMemberPortion.count({
      where: {
        familyMemberId: input.id,
        recipe: { userId: input.userId },
      },
    }),
    prisma.recipeIngredientMemberTarget.count({
      where: {
        familyMemberId: input.id,
        recipeIngredient: { recipe: { userId: input.userId } },
      },
    }),
  ]);

  return {
    hasRecipeImpact:
      audienceRows + portionRows + ingredientTargetRows > 0,
  };
}
