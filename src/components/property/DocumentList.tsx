import { useState } from "react";
import { FileText, Download, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const handleDownload = async (doc: Document) => {
    try {
      setDownloadingId(doc.id);
      const { data, error } = await supabase.storage
        .from("property_documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  };

  const openDeleteDialog = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      setDeletingId(documentToDelete.id);
      setDeleteDialogOpen(false);

      const { error: storageError } = await supabase.storage
        .from("property_documents")
        .remove([documentToDelete.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", documentToDelete.id);

      if (dbError) throw dbError;

      toast.success("Document deleted successfully");

      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
      setDocumentToDelete(null);
    }
  };

  const getFileTypeIcon = (documentType: string) => {
    // Could be extended to show different icons based on file type
    return <FileText className="h-5 w-5 text-brand-indigo-light" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <>
      <div className="space-y-4">
        {documents.map((doc) => {
          const isDownloading = downloadingId === doc.id;
          const isDeleting = deletingId === doc.id;

          return (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-4 bg-white/[0.04] rounded-lg transition-opacity ${
                isDeleting ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getFileTypeIcon(doc.document_type)}
                <div className="min-w-0 flex-1">
                  <p className="text-white truncate" title={doc.filename}>
                    {doc.filename}
                  </p>
                  <div className="text-sm text-gray-400 space-y-0.5">
                    <p>
                      {new Date(doc.created_at).toLocaleDateString()}
                      {doc.document_type && (
                        <span className="ml-2 uppercase text-xs bg-white/10 px-1.5 py-0.5 rounded">
                          {doc.document_type}
                        </span>
                      )}
                    </p>
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
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(doc)}
                  disabled={isDownloading || isDeleting}
                  title="Download document"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(doc)}
                  disabled={isDownloading || isDeleting}
                  title="Delete document"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.filename}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}