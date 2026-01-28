import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/src/generated/client";
import { ROUTES } from "@/lib/constants";
import { createRecipe, deleteRecipe, updateRecipe } from "@/lib/db/recipes";
import { redirect } from "next/navigation";
import {
  createRecipeAction,
  deleteRecipeAction,
  updateRecipeAction,
} from "./recipe-actions";
import { appendRedirectToastToPath } from "@/lib/messages";

vi.mock("next/navigation", () => ({
  // Keep redirect mocked so tests can assert target route.
  redirect: vi.fn(),
}));

vi.mock("@/lib/db/recipes", () => ({
  // Keep non-delete exports mocked for module compatibility.
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

function makeKnownPrismaError(code: string) {
  // Build an object that passes `instanceof PrismaClientKnownRequestError`.
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError & { code: string };

  error.code = code;
  return error;
}

describe("deleteRecipeAction", () => {
  const recipeId = "recipe-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes recipe and redirects to recipes list on success", async () => {
    vi.mocked(deleteRecipe).mockResolvedValue({ id: recipeId });

    const result = await deleteRecipeAction(recipeId);

    // redirect is terminal; mocked version returns undefined in tests.
    expect(result).toBeUndefined();
    expect(deleteRecipe).toHaveBeenCalledWith(recipeId);
    expect(redirect).toHaveBeenCalledWith(ROUTES.recipes);
  });

  it("returns not-found message for Prisma P2025", async () => {
    vi.mocked(deleteRecipe).mockRejectedValue(makeKnownPrismaError("P2025"));

    const result = await deleteRecipeAction(recipeId);

    expect(result).toEqual({
      type: "error",
      message: "Recipe was not found (it may already be deleted).",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns generic error for unexpected failures", async () => {
    vi.mocked(deleteRecipe).mockRejectedValue(new Error("boom"));

    const result = await deleteRecipeAction(recipeId);

    expect(result).toEqual({
      type: "error",
      message: "Failed to delete recipe",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("recipe save redirects", () => {
  const createPayload = { name: "Tomato Soup" } as any;
  const updatePayload = { name: "Tomato Soup Updated" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects after successful create with destination toast code", async () => {
    vi.mocked(createRecipe).mockResolvedValue({ slug: "tomato-soup" } as any);

    const result = await createRecipeAction(createPayload);

    expect(result).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith(
      appendRedirectToastToPath("/recipes/tomato-soup", "recipeCreated"),
    );
  });

  it("redirects after successful update with destination toast code", async () => {
    vi.mocked(updateRecipe).mockResolvedValue({
      slug: "tomato-soup-updated",
    } as any);

    const result = await updateRecipeAction("recipe-1", updatePayload);

    expect(result).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith(
      appendRedirectToastToPath("/recipes/tomato-soup-updated", "recipeUpdated"),
    );
  });
});
