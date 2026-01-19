import { Button } from "@/components/ui/button";
import Image from "next/image";
import { X } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={uploadingIndexes.size > 0}
        >
          Add Images
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
