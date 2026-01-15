import { Button } from "@/components/ui/button";
import { uploadImageAction } from "@/actions/upload-actions";
import { useState, useRef } from "react";
import { toast } from "sonner";

export function ImageUploader({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
}) {
  // All state managed in component
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation constants
  const maxSize = 1 * 1024 * 1024; // 5MB
  const acceptType = "image/*";

  // Validation function
  const validateFile = (selectedFile: File): string | null => {
    if (selectedFile.size > maxSize) {
      return `File size must be less than 5MB`;
    }
    if (!selectedFile.type.startsWith("image/")) {
      return `File must be an image`;
    }
    return null;
  };

  // Helper function to set or clear file state
  const setFileState = (
    file: File | null,
    fileName?: string,
    fileSize?: number
  ) => {
    if (file) {
      setFile(file);
      setFileName(fileName ?? file.name);
      setFileSize(fileSize ?? file.size);
    } else {
      // Clear state
      setFile(null);
      setFileName("");
      setFileSize(0);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset error
    setError("");

    // Client validation
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFileState(null);
      return;
    }

    setIsUploading(true);
    const result = await uploadImageAction(selectedFile);
    if (result.success) {
      setFileState(selectedFile);
      onChange(result.url);
    } else {
      setError(result.error);
    }
    setIsUploading(false);
  };

  // Clear file
  const clearFile = () => {
    setError("");
    setFileState(null);
    onChange(null); // Clear form state
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Select Image"}
        </Button>
        {(fileName || value) && (
          <Button
            type="button"
            onClick={clearFile}
            variant="ghost"
            size="sm"
            disabled={isUploading}
          >
            Clear
          </Button>
        )}
      </div>

      <input
        type="file"
        accept={acceptType}
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
        disabled={isUploading}
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
