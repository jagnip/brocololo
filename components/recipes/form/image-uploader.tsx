import { useFileInput } from "@/components/hooks/use-file-input"
import { Button } from "@/components/ui/button";

export function ImageUploader() {
  const {
    fileName,
    error,
    fileInputRef,
    handleFileSelect,
    fileSize,
    clearFile,
  } = useFileInput({
    accept: "image/*",
    maxSize: 5,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
        >
          Select Image
        </Button>
        {fileName && (
          <Button type="button" onClick={clearFile} variant="ghost" size="sm">
            Clear
          </Button>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {fileName && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Selected: {fileName}</p>
          <p className="text-sm text-muted-foreground">
            Size: {(fileSize / (1024 * 1024)).toFixed(2)}MB
          </p>
        </div>
      )}
      {error && <p className="text-sm text-red-500">Error: {error}</p>}
    </div>
  );
}


