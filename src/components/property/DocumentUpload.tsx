import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentUploadProps {
  propertyId: string;
  onUploadComplete: () => void;
}

export function DocumentUpload({ propertyId, onUploadComplete }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${propertyId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('property_documents')
        .upload(filePath, file);

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
    } catch (error: any) {
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
        accept=".pdf,.doc,.docx,.txt"
      />
    </div>
  );
}