"use client";

import Image from "next/image";
import { RecipeImageType } from "@/types/images";

type ImageGalleryProps = {
  images: RecipeImageType[];
};

export function ImageGallery({ images }: ImageGalleryProps) {
  if (!images || images.length === 0) return null;

  const coverImage = images.find((img) => img.isCover) || images[0];
  const otherImages = images.filter((img) => img.url !== coverImage?.url);

  const handleImageClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      {/* Cover image */}
      {coverImage && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden">
          <Image
            src={coverImage.url}
            alt={"Recipe cover image"}
            fill
            className="object-cover cursor-pointer"
            onClick={() => handleImageClick(coverImage.url)}
          />
        </div>
      )}

      {/* Additional images grid */}
      {otherImages.length > 0 && (
        <div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
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
