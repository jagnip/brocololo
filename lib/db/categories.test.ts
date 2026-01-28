import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/src/generated/client";
import { createRecipeCategory } from "./categories";

vi.mock("./index", () => ({
  prisma: {
    category: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "./index";

type MockCategory = {
  id: string;
  name?: string;
  slug?: string;
  type?: "FLAVOUR" | "RECIPE_TYPE" | "PROTEIN";
  parentId?: string | null;
};

function makeKnownPrismaError(code: string) {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError & { code: string };
  error.code = code;
  return error;
}

describe("createRecipeCategory", () => {
  const findFirstMock = vi.mocked(prisma.category.findFirst);
  const createMock = vi.mocked(prisma.category.create);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates recipe type under sweet parent when sweet is selected", async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: "flavour-savoury" } as MockCategory)
      .mockResolvedValueOnce({ id: "flavour-sweet" } as MockCategory);
    createMock.mockResolvedValue({
      id: "cat-1",
      name: "Sweet pies",
      slug: "sweet-pies",
      type: "RECIPE_TYPE",
      parentId: "flavour-sweet",
    } as MockCategory);

    const result = await createRecipeCategory({
      flavourSlug: "sweet",
      kind: "RECIPE_TYPE",
      name: "Sweet pies",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Sweet pies",
        slug: "sweet-pies",
        type: "RECIPE_TYPE",
        parentId: "flavour-sweet",
      },
    });
    expect(result.id).toBe("cat-1");
  });

  it("creates protein under savoury parent", async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: "flavour-savoury" } as MockCategory)
      .mockResolvedValueOnce({ id: "flavour-sweet" } as MockCategory);
    createMock.mockResolvedValue({
      id: "cat-2",
      name: "Chicken",
      slug: "chicken",
      type: "PROTEIN",
      parentId: "flavour-savoury",
    } as MockCategory);

    await createRecipeCategory({
      flavourSlug: "savoury",
      kind: "PROTEIN",
      name: "Chicken",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Chicken",
        slug: "chicken",
        type: "PROTEIN",
        parentId: "flavour-savoury",
      },
    });
  });

  it("rejects protein creation under sweet flavour", async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: "flavour-savoury" } as MockCategory)
      .mockResolvedValueOnce({ id: "flavour-sweet" } as MockCategory);

    await expect(
      createRecipeCategory({
        flavourSlug: "sweet",
        kind: "PROTEIN",
        name: "Fish",
      }),
    ).rejects.toThrow("Protein category cannot be created under sweet flavour.");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("fails when required flavour categories are missing", async () => {
    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "flavour-sweet",
    } as MockCategory);

    await expect(
      createRecipeCategory({
        flavourSlug: "savoury",
        kind: "RECIPE_TYPE",
        name: "Stews",
      }),
    ).rejects.toThrow("Required flavour categories (savoury/sweet) are missing.");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps unique constraint violations to a friendly message", async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: "flavour-savoury" } as MockCategory)
      .mockResolvedValueOnce({ id: "flavour-sweet" } as MockCategory);
    createMock.mockRejectedValue(makeKnownPrismaError("P2002"));

    await expect(
      createRecipeCategory({
        flavourSlug: "savoury",
        kind: "RECIPE_TYPE",
        name: "Fish",
      }),
    ).rejects.toThrow("A category with this name already exists.");
  });
});
