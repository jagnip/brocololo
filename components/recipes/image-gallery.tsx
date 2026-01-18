"use client";

import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";

type ImageGalleryProps = {
  images: Array<{ url: string; isCover?: boolean }>;
  recipeName: string;
};

export function ImageGallery({ images, recipeName }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  const coverImage = images.find((img) => img.isCover) || images[0];
  const otherImages = images.filter((img) => img.url !== coverImage?.url);

  return (
    <>
      <div className="space-y-4">
        {/* Cover Image - Large */}
        {coverImage && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden">
            <Image
              src={coverImage.url}
              alt={`${recipeName} - cover`}
              fill
              className="object-cover cursor-pointer"
              onClick={() => setSelectedImage(coverImage.url)}
            />
          </div>
        )}

        {/* Additional Images Grid */}
        {otherImages.length > 0 && (
          <div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {otherImages.map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(image.url)}
                >
                  <Image
                    src={image.url}
                    alt={`${recipeName} - image ${index + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl p-0">
          {selectedImage && (
            <div className="relative w-full aspect-video">
              <Image
                src={selectedImage}
                alt={`${recipeName} - full size`}
                fill
                className="object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
