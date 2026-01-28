import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  propertyId: string;
  onUploadComplete: () => void;
}

// Allowed file types with their MIME types
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
};

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function validateFile(file: File): string | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`;
  }

  // Extract and validate extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_FILE_TYPES[ext]) {
    return `File type .${ext || "unknown"} is not allowed. Allowed: ${Object.keys(ALLOWED_FILE_TYPES).join(", ")}`;
  }

  // Verify MIME type matches expected types for the extension
  const allowedMimes = ALLOWED_FILE_TYPES[ext];
  if (!allowedMimes.includes(file.type)) {
    return `File content type (${file.type}) does not match extension (.${ext})`;
  }

  return null; // Valid
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function DocumentUpload({ propertyId, onUploadComplete }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);

      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
      const filePath = `${propertyId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("property_documents")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase
        .from("property_documents")
        .insert({
          property_id: propertyId,
          filename: selectedFile.name,
          file_path: filePath,
          document_type: fileExt || "unknown",
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setSelectedFile(null);
      onUploadComplete();
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          isDragging
            ? "border-brand-indigo-light bg-brand-indigo-light/10"
            : "border-white/20 hover:border-white/40 hover:bg-white/[0.02]",
          selectedFile && "cursor-default"
        )}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileUp className="h-8 w-8 text-brand-indigo-light flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
                disabled={isUploading}
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
            <p className="text-white font-medium">
              Drag and drop a file here, or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG (max {MAX_FILE_SIZE_MB}MB)
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
      />
    </div>
  );
}