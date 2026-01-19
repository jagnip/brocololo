import { useState, useRef } from "react";
import { uploadImageAction } from "@/actions/upload-actions";
import { RecipeImageType } from "@/types/images";

type ImageFormType = Pick<RecipeImageType, "url" | "isCover">;

export function useImageUpload(
  value: ImageFormType[],
  onChange: (images: ImageFormType[]) => void
) {
  // State management
  const [uploadingIndexes, setUploadingIndexes] = useState<Set<number>>(
    new Set()
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants
  const maxSize = 5 * 1024 * 1024; // 5MB
  const acceptType = "image/*";

  // Validation
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than 5MB`;
    }
    if (!file.type.startsWith("image/")) {
      return `File must be an image`;
    }
    return null;
  };

  // File selection handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setErrors({});

    const newImages: ImageFormType[] = [];
    const startIndex = value.length;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const currentIndex = startIndex + i;

      const validationError = validateFile(file);
      if (validationError) {
        setErrors((prev) => ({ ...prev, [currentIndex]: validationError }));
        continue;
      }

      setUploadingIndexes((prev) => new Set(prev).add(currentIndex));

      try {
        const result = await uploadImageAction(file);
        if (result.success) {
          const isCover =
            value.length === 0 && i === 0 && !value.some((img) => img.isCover);

          newImages.push({
            url: result.url,
            isCover,
          });
        } else {
          setErrors((prev) => ({ ...prev, [currentIndex]: result.error }));
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [currentIndex]: "Failed to upload image",
        }));
      } finally {
        setUploadingIndexes((prev) => {
          const next = new Set(prev);
          next.delete(currentIndex);
          return next;
        });
      }
    }

    // Update form with new images if any were successfully uploaded
    if (newImages.length > 0) {
      const hasCover =
        value.some((img) => img.isCover) ||
        newImages.some((img) => img.isCover);

      if (!hasCover && newImages.length > 0) {
        newImages[0].isCover = true;
      }

      onChange([...value, ...newImages]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove image handler
  const removeImage = (index: number) => {
    const imageToRemove = value[index];
    const newImages = value.filter((_, i) => i !== index);

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

  // Set cover image handler
  const setCoverImage = (index: number) => {
    const newImages = value.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    onChange(newImages);
  };

  // Return everything the component needs
  return {
    handleFileSelect,
    removeImage,
    setCoverImage,
    uploadingIndexes,
    errors,
    fileInputRef,
    acceptType,
  };
}

