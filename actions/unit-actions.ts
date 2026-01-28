"use server";

import { Prisma } from "@/src/generated/client";
import { createUnit, getUnitById, renameUnit } from "@/lib/db/units";
import { createUnitSchema, renameUnitSchema } from "@/lib/validations/unit";
import type { UnitType } from "@/types/unit";

type UnitActionError = {
  type: "error";
  message: string;
};

type UnitActionSuccess = {
  type: "success";
  unit: UnitType;
};

export type CreateUnitInlineActionResult = UnitActionError | UnitActionSuccess;
export type RenameUnitInlineActionResult = UnitActionError | UnitActionSuccess;

export async function createUnitInlineAction(
  formData: { name: string; namePlural?: string },
): Promise<CreateUnitInlineActionResult> {
  const parsed = createUnitSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      type: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid unit data",
    };
  }

  try {
    const unit = await createUnit(parsed.data);
    return {
      type: "success",
      unit,
    };
  } catch (error) {
    console.error("Error creating unit", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        type: "error",
        message: "A unit with this name already exists",
      };
    }

    return {
      type: "error",
      message: "Failed to create unit",
    };
  }
}

export async function renameUnitInlineAction(
  formData: { unitId: string; name: string; namePlural?: string },
): Promise<RenameUnitInlineActionResult> {
  const parsed = renameUnitSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      type: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid unit data",
    };
  }

  const currentUnit = await getUnitById(parsed.data.unitId);
  if (!currentUnit) {
    return {
      type: "error",
      message: "Unit not found",
    };
  }

  // Keep grams immutable because app logic depends on "g" as canonical base unit.
  if (currentUnit.name === "g") {
    return {
      type: "error",
      message: "Unit 'g' cannot be renamed",
    };
  }

  try {
    const unit = await renameUnit(parsed.data);
    return {
      type: "success",
      unit,
    };
  } catch (error) {
    console.error("Error renaming unit", error);

    if (error instanceof Error && error.message === "DUPLICATE_UNIT_NAME") {
      return {
        type: "error",
        message: "A unit with this name already exists",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        type: "error",
        message: "A unit with this name already exists",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        type: "error",
        message: "Unit not found",
      };
    }

    return {
      type: "error",
      message: "Failed to rename unit",
    };
  }
}
