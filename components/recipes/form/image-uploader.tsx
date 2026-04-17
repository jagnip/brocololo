import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { RecipeImageType } from "@/types/images";
import { useImageUpload } from "@/hooks/use-image-upload";

type ImageFormType = Pick<RecipeImageType, "url" | "isCover">;

export function ImageUploader({
  value = [],
  onChange,
}: {
  value?: ImageFormType[];
  onChange: (images: ImageFormType[]) => void;
}) {

  const {
    handleFileSelect,
    removeImage,
    setCoverImage,
    uploadingIndexes,
    errors,
    fileInputRef,
    acceptType,
  } = useImageUpload(value, onChange);

  return (
    <div className="flex flex-col gap-item">
      <div className="flex gap-4 items-center">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={uploadingIndexes.size > 0}
        >
          {uploadingIndexes.size > 0 ? "Uploading..." : "Upload images"}
        </Button>
      </div>

      <input
        type="file"
        accept={acceptType}
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
        disabled={uploadingIndexes.size > 0}
      />

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-item">
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

         
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1 sm:flex-row sm:gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCoverImage(index)}
                      disabled={image.isCover}
                    >
                      {image.isCover ? "Cover" : "Set cover"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeImage(index)}
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

  
                  {image.isCover && (
                    <Badge className="absolute top-2 left-2" variant="default">
                      Cover
                    </Badge>
                  )}
{/* 
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm">Uploading...</div>
                    </div>
                  )} */}

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
