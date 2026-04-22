"use client";

import Image from "next/image";
import { RecipeImageType } from "@/types/images";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";

type ImageGalleryProps = {
  images: RecipeImageType[];
};

export function ImageGallery({ images }: ImageGalleryProps) {
  const coverImageUrl = getRecipeDisplayImageUrl(images);
  const otherImages = images.filter((img) => img.url !== coverImageUrl);

  const handleImageClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-block">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden">
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
      {otherImages.length > 0 && (
        <div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-item">
            {otherImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
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
      )}
    </div>
  );
}
