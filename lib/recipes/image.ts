type RecipeImageInput = {
  url: string;
  isCover?: boolean | null;
};

/**
 * Picks the best image for recipe surfaces.
 * Priority: explicit cover image, then first image, then null.
 */
export function getRecipeDisplayImageUrl(
  images?: RecipeImageInput[] | null,
): string | null {
  if (!images || images.length === 0) {
    return null;
  }

  // Prefer the user-selected cover image when one exists.
  const coverImage = images.find((image) => image.isCover);
  return coverImage?.url ?? images[0]?.url ?? null;
}
