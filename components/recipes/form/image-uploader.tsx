import { Button } from "@/components/ui/button";
import { uploadImageAction } from "@/actions/upload-actions";
import { useState, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { X } from "lucide-react";
import { RecipeImageType } from "@/types/images";

type ImageFormType = Pick<RecipeImageType, "url" | "isCover">;

export function ImageUploader({
  value = [],
  onChange,
  maxImages = 10,
}: {
  value?: ImageFormType[];
  onChange: (images: ImageFormType[]) => void;
  maxImages?: number;
}) {
  // NEW: Track which images are currently uploading (by index)
  const [uploadingIndexes, setUploadingIndexes] = useState<Set<number>>(
    new Set()
  );

  // NEW: Track errors per image (by index)
  const [errors, setErrors] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSize = 5 * 1024 * 1024; // 5MB
  const acceptType = "image/*";

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than 5MB`;
    }
    if (!file.type.startsWith("image/")) {
      return `File must be an image`;
    }
    return null;
  };

  // NEW: Handles multiple file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // NEW: Convert FileList to array for easier manipulation
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // NEW: Check if adding these files would exceed the max limit
    if (value.length + selectedFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // NEW: Clear any previous errors
    setErrors({});

    // NEW: Validate all files first (before uploading)
    const validFiles: File[] = [];
    selectedFiles.forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        // NEW: Store error for this specific file index
        setErrors((prev) => ({ ...prev, [value.length + index]: error }));
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // NEW: Upload files sequentially (one at a time)
    const newImages: ImageFormType[] = [];
    const startIndex = value.length; // NEW: Where new images will start in the array

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const currentIndex = startIndex + i; // NEW: Index in the final array

      // NEW: Mark this image as uploading
      setUploadingIndexes((prev) => new Set(prev).add(currentIndex));

      try {
        const result = await uploadImageAction(file);
        if (result.success) {
          // NEW: First image in the batch becomes cover if no cover exists yet
          const isCover =
            value.length === 0 && i === 0 && !value.some((img) => img.isCover);

          newImages.push({
            url: result.url,
            isCover,
          });
        } else {
          // NEW: Store upload error for this specific image
          setErrors((prev) => ({ ...prev, [currentIndex]: result.error }));
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [currentIndex]: "Failed to upload image",
        }));
      } finally {
        // NEW: Remove from uploading set when done
        setUploadingIndexes((prev) => {
          const next = new Set(prev);
          next.delete(currentIndex);
          return next;
        });
      }
    }

    // NEW: Update form with new images if any were successfully uploaded
    if (newImages.length > 0) {
      // NEW: Ensure at least one cover image exists
      const hasCover =
        value.some((img) => img.isCover) ||
        newImages.some((img) => img.isCover);

      if (!hasCover && newImages.length > 0) {
        newImages[0].isCover = true;
      }

      // NEW: Combine existing images with new ones
      onChange([...value, ...newImages]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // NEW: Removes an image from the array
  const removeImage = (index: number) => {
    const imageToRemove = value[index];
    const newImages = value.filter((_, i) => i !== index);

    // NEW: If we removed the cover image, set first remaining as cover
    if (imageToRemove.isCover && newImages.length > 0) {
      newImages[0].isCover = true;
    }

    onChange(newImages);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // NEW: Sets a specific image as the cover image
  const setCoverImage = (index: number) => {
    const newImages = value.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    onChange(newImages);
  };

  // NEW: Check if we can add more images
  const canAddMore = value.length < maxImages;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={!canAddMore || uploadingIndexes.size > 0}
        >
          {uploadingIndexes.size > 0
            ? "Uploading..."
            : canAddMore
            ? "Add Images"
            : `Maximum ${maxImages} images`}
        </Button>
        {/* NEW: Show current count */}
        {value.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {value.length} / {maxImages} images
          </span>
        )}
      </div>

      <input
        type="file"
        accept={acceptType}
        multiple // NEW: Allow multiple file selection
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
        disabled={!canAddMore || uploadingIndexes.size > 0}
      />

      {/* NEW: Image Grid - shows all uploaded images */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((image, index) => {
            const isUploading = uploadingIndexes.has(index);
            const error = errors[index];

            return (
              <div
                key={index}
                className="relative group border rounded-lg overflow-hidden aspect-square"
              >
                <div className="relative w-full h-full">
                  <Image
                    src={image.url}
                    alt={`Recipe image ${index + 1}`}
                    fill
                    className="object-cover"
                  />

                  {/* NEW: Hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCoverImage(index)}
                      disabled={image.isCover}
                    >
                      {image.isCover ? "Cover" : "Set Cover"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* NEW: Cover badge */}
                  {image.isCover && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold">
                      Cover
                    </div>
                  )}

                  {/* NEW: Uploading indicator */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm">Uploading...</div>
                    </div>
                  )}

                  {/* NEW: Error indicator */}
                  {error && (
                    <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                      <div className="text-white text-xs text-center px-2">
                        {error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW: Global error message */}
      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-500">
          Some images failed to upload. Please try again.
        </p>
      )}
    </div>
  );
}
