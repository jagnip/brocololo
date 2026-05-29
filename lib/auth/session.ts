import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/index";

export type AppUser = {
  id: string;
  clerkId: string;
  email: string | null;
  familyMembers: Array<{
    id: string;
    name: string;
    position: number;
  }>;
};

/**
 * Finds or creates the app User row for the signed-in Clerk account.
 * New sign-ups get an empty account (no recipes/plans yet).
 */
export async function getOrCreateUser(clerkId: string): Promise<AppUser> {
  const existing = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      familyMembers: {
        orderBy: { position: "asc" },
        select: { id: true, name: true, position: true },
      },
    },
  });

  if (existing) {
    return existing;
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;

  return prisma.user.create({
    data: {
      clerkId,
      email,
    },
    include: {
      familyMembers: {
        orderBy: { position: "asc" },
        select: { id: true, name: true, position: true },
      },
    },
  });
}

/** Requires an authenticated Clerk session and returns the scoped app user. */
export async function requireUser(): Promise<AppUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("UNAUTHORIZED");
  }
  return getOrCreateUser(clerkId);
}
