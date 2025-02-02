import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DocumentListProps {
  propertyId: string;
  onDocumentDeleted: () => void;
}

export function DocumentList({ propertyId, onDocumentDeleted }: DocumentListProps) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ["propertyDocuments", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("property_documents")
        .download(filePath);

      if (error) throw error;

      // Create download link
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("property_documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast.success("Document deleted successfully");
      onDocumentDeleted();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  if (isLoading) {
    return <div className="text-gray-400">Loading documents...</div>;
  }

  if (!documents?.length) {
    return <div className="text-gray-400">No documents uploaded yet.</div>;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 bg-[#403E43] rounded-lg"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#9b87f5]" />
            <div>
              <p className="text-white">{doc.filename}</p>
              <p className="text-sm text-gray-400">
                {new Date(doc.created_at).toLocaleDateString()}
              </p>
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