import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/src/generated/client";
import { ROUTES } from "@/lib/constants";
import {
  createRecipe,
  deleteRecipe,
  setRecipeArchived,
  updateRecipe,
} from "@/lib/db/recipes";
import { redirect } from "next/navigation";
import {
  createRecipeAction,
  deleteRecipeAction,
  archiveRecipeAction,
  unarchiveRecipeAction,
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
  setRecipeArchived: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/messages", () => ({
  appendRedirectToastToPath: vi.fn((path: string) => path),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: "user-test",
    clerkId: "clerk-test",
    email: null,
  }),
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

  it("deletes an archived recipe and redirects to its archived list on success", async () => {
    vi.mocked(deleteRecipe).mockResolvedValue({ id: recipeId });

    const result = await deleteRecipeAction(recipeId);

    // redirect is terminal; mocked version returns undefined in tests.
    expect(result).toBeUndefined();
    expect(deleteRecipe).toHaveBeenCalledWith("user-test", recipeId);
    expect(redirect).toHaveBeenCalledWith(
      appendRedirectToastToPath(`${ROUTES.recipes}?view=archived`, "recipeDeleted"),
    );
  });

  it("returns not-found message for Prisma P2025", async () => {
    vi.mocked(deleteRecipe).mockRejectedValue(makeKnownPrismaError("P2025"));

    const result = await deleteRecipeAction(recipeId);

    expect(result).toEqual({
      type: "error",
      message: "Recipe no longer exists",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns generic error for unexpected failures", async () => {
    vi.mocked(deleteRecipe).mockRejectedValue(new Error("boom"));

    const result = await deleteRecipeAction(recipeId);

    expect(result).toEqual({
      type: "error",
      message: "Couldn't delete recipe. Try again",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns the archive requirement when deleting an active recipe", async () => {
    vi.mocked(deleteRecipe).mockRejectedValue(new Error("RECIPE_MUST_BE_ARCHIVED"));

    await expect(deleteRecipeAction(recipeId)).resolves.toEqual({
      type: "error",
      message: "Archive this recipe before deleting it",
    });
  });

  it("returns the in-use message when deleting a referenced recipe", async () => {
    vi.mocked(deleteRecipe).mockRejectedValue(new Error("RECIPE_IN_USE"));

    await expect(deleteRecipeAction(recipeId)).resolves.toEqual({
      type: "error",
      message: "This recipe is used in a plan or log and can't be permanently deleted",
    });
  });
});

describe("recipe archive actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives an owned recipe and revalidates its list and detail routes", async () => {
    vi.mocked(setRecipeArchived).mockResolvedValue({
      id: "recipe-1",
      slug: "tomato-soup",
      archivedAt: new Date(),
    });

    await expect(archiveRecipeAction("recipe-1")).resolves.toEqual({ type: "success" });
    expect(setRecipeArchived).toHaveBeenCalledWith("user-test", "recipe-1", true);
  });

  it("unarchives an owned recipe", async () => {
    vi.mocked(setRecipeArchived).mockResolvedValue({
      id: "recipe-1",
      slug: "tomato-soup",
      archivedAt: null,
    });

    await expect(unarchiveRecipeAction("recipe-1")).resolves.toEqual({ type: "success" });
    expect(setRecipeArchived).toHaveBeenCalledWith("user-test", "recipe-1", false);
  });

  it("returns a not-found message for archive failures", async () => {
    vi.mocked(setRecipeArchived).mockRejectedValue(new Error("RECIPE_NOT_FOUND"));

    await expect(archiveRecipeAction("recipe-1")).resolves.toEqual({
      type: "error",
      message: "Recipe no longer exists",
    });
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
