import { FileText, Download, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Document {
  id: string;
  filename: string;
  file_path: string;
  document_type: string;
  created_at: string;
  property_name?: string;
  uploader_first_name?: string;
  uploader_last_name?: string;
}

interface DocumentListProps {
  documents: Document[];
  showPropertyName?: boolean;
  showUploaderInfo?: boolean;
}

export function DocumentList({ 
  documents, 
  showPropertyName = false, 
  showUploaderInfo = false 
}: DocumentListProps) {
  const handleDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("property_documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("property_documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast.success("Document deleted successfully");
      window.location.reload();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 bg-white/[0.04] rounded-lg"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-brand-indigo-light" />
            <div>
              <p className="text-white">{doc.filename}</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>{new Date(doc.created_at).toLocaleDateString()}</p>
                {showPropertyName && doc.property_name && (
                  <p>Property: {doc.property_name}</p>
                )}
                {showUploaderInfo && doc.uploader_first_name && (
                  <p>
                    Uploaded by: {doc.uploader_first_name} {doc.uploader_last_name}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload(doc.file_path, doc.filename)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(doc.id, doc.file_path)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}