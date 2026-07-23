"use client";

import Image from "next/image";
import { RecipeImageType } from "@/types/images";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";
import { cn } from "@/lib/utils";

type ImageGalleryProps = {
  images: RecipeImageType[];
  /**
   * On md+, stretch the cover to the parent row height (e.g. beside nutrition)
   * so the crop adapts instead of leaving empty space under a fixed aspect ratio.
   */
  fillHeight?: boolean;
};

export function ImageGallery({
  images,
  fillHeight = false,
}: ImageGalleryProps) {
  const coverImageUrl = getRecipeDisplayImageUrl(images);
  const otherImages = images.filter((img) => img.url !== coverImageUrl);
  const hasThumbnails = otherImages.length > 0;

  const handleImageClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "gap-block",
        // Fill the stretched grid cell so cover height tracks the nutrition column.
        fillHeight ? "flex h-full flex-col" : "space-y-block",
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl",
          // Mobile keeps a predictable touch-friendly frame.
          "aspect-video",
          // Desktop: grow with the row; min height avoids a tiny crop when nutrition is short.
          fillHeight && "md:aspect-auto md:min-h-72 md:flex-1",
          !fillHeight && "md:aspect-3/1",
        )}
      >
        {/* Show a first-class fallback so the detail layout stays aligned without uploads. */}
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={"Recipe cover image"}
            fill
            className="object-cover cursor-pointer"
            onClick={() => handleImageClick(coverImageUrl)}
          />
        ) : (
          <RecipeImagePlaceholder />
        )}
      </div>

      {/* Additional images grid */}
      {hasThumbnails ? (
        <div className={cn(fillHeight && "shrink-0")}>
          <div
            className={cn(
              "grid grid-cols-3 gap-item md:grid-cols-4",
              // Large screens: keep secondary images at a thumbnail scale instead of
              // letting them grow with the full photo column width.
              "lg:max-w-[22rem]",
            )}
          >
            {otherImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-80"
                onClick={() => handleImageClick(image.url)}
              >
                <Image
                  src={image.url}
                  alt={"Recipe image"}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
