"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { FAMILY_MEMBERS_MAX_PER_USER, ROUTES } from "@/lib/constants";
import {
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMemberRecipeImpact,
  listFamilyMembers,
  updateFamilyMemberName,
} from "@/lib/db/family-members";
import {
  createFamilyMemberSchema,
  deleteFamilyMemberSchema,
  updateFamilyMemberNameSchema,
} from "@/lib/validations/family-member";

function revalidateSettings() {
  revalidatePath(ROUTES.settings);
}

export async function updateFamilyMemberNameAction(
  input: unknown,
): Promise<
  | { type: "success"; member: { id: string; name: string; isSelf: boolean; sortOrder: number } }
  | { type: "error"; message: string }
> {
  const parsed = updateFamilyMemberNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ?? "Could not update name. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const member = await updateFamilyMemberName({
      userId,
      id: parsed.data.id,
      name: parsed.data.name.trim(),
    });
    revalidateSettings();
    return { type: "success", member };
  } catch {
    return { type: "error", message: "Could not update name. Try again." };
  }
}

export async function createFamilyMemberAction(
  input: unknown,
): Promise<
  | { type: "success"; member: { id: string; name: string; isSelf: boolean; sortOrder: number } }
  | { type: "error"; message: string }
> {
  const parsed = createFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ?? "Could not add member. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const members = await listFamilyMembers(userId);
    if (members.length >= FAMILY_MEMBERS_MAX_PER_USER) {
      return { type: "error", message: "Too many family members." };
    }

    const member = await createFamilyMember({
      userId,
      name: (parsed.data.name ?? "").trim(),
    });
    revalidateSettings();
    return { type: "success", member };
  } catch {
    return { type: "error", message: "Could not add member. Try again." };
  }
}

export async function deleteFamilyMemberAction(
  input: unknown,
): Promise<{ type: "success" } | { type: "error"; message: string }> {
  const parsed = deleteFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Could not remove member. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    await deleteFamilyMember({ userId, id: parsed.data.id });
    revalidateSettings();
    return { type: "success" };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CANNOT_DELETE_SELF_MEMBER"
    ) {
      return {
        type: "error",
        message: "You cannot remove your own row.",
      };
    }
    return { type: "error", message: "Could not remove member. Try again." };
  }
}

export async function getFamilyMemberRecipeImpactAction(
  input: unknown,
): Promise<
  | { type: "success"; hasRecipeImpact: boolean }
  | { type: "error"; message: string }
> {
  const parsed = deleteFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Could not check member usage. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const impact = await getFamilyMemberRecipeImpact({
      userId,
      id: parsed.data.id,
    });
    return {
      type: "success",
      hasRecipeImpact: impact.hasRecipeImpact,
    };
  } catch {
    return { type: "error", message: "Could not check member usage. Try again." };
  }
}
