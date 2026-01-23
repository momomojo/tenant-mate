import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentUploadProps {
  propertyId: string;
  onUploadComplete: () => void;
}

// Allowed file types with their MIME types
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
};

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function validateFile(file: File): string | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`;
  }

  // Extract and validate extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_FILE_TYPES[ext]) {
    return `File type .${ext || 'unknown'} is not allowed. Allowed: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`;
  }

  // Verify MIME type matches expected types for the extension
  const allowedMimes = ALLOWED_FILE_TYPES[ext];
  if (!allowedMimes.includes(file.type)) {
    return `File content type (${file.type}) does not match extension (.${ext})`;
  }

  return null; // Valid
}

export function DocumentUpload({ propertyId, onUploadComplete }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsUploading(true);

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const filePath = `${propertyId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('property_documents')
        .upload(filePath, file, {
          contentType: file.type, // Explicitly set content type
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          filename: file.name,
          file_path: filePath,
          document_type: fileExt || 'unknown',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      onUploadComplete();
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        className="gap-2"
        disabled={isUploading}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <Upload className="h-4 w-4" />
        Upload Document
      </Button>
      <input
        id="fileInput"
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
      />
    </div>
  );
}