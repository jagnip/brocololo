/** Comma-separated Clerk user IDs with admin privileges (set per environment). */
export function isAdmin(clerkId: string): boolean {
  const ids =
    process.env.ADMIN_CLERK_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ??
    [];
  return ids.includes(clerkId);
}
