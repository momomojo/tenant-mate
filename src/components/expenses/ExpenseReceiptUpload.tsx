import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUploadExpenseReceipt, useDeleteExpenseReceipt } from "@/hooks/useExpenseReceipts";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image, Loader2, ExternalLink } from "lucide-react";

interface ExpenseReceiptUploadProps {
  expenseId?: string;
  currentReceiptUrl?: string | null;
  currentReceiptPath?: string | null;
  onFileSelect?: (file: File | null) => void;
  pendingFile?: File | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function ExpenseReceiptUpload({
  expenseId,
  currentReceiptUrl,
  currentReceiptPath,
  onFileSelect,
  pendingFile,
}: ExpenseReceiptUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { mutate: uploadReceipt, isPending: isUploading } = useUploadExpenseReceipt();
  const { mutate: deleteReceipt, isPending: isDeleting } = useDeleteExpenseReceipt();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a JPEG, PNG, WebP, or PDF file.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 10MB.";
    }
    return null;
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      onFileSelect?.(null);
      return;
    }

    const error = validateFile(file);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }

    if (expenseId) {
      // Upload immediately for existing expense
      uploadReceipt(
        { expenseId, file },
        {
          onSuccess: () => {
            toast({ title: "Receipt uploaded successfully" });
          },
          onError: (err) => {
            toast({
              title: "Upload failed",
              description: err instanceof Error ? err.message : "Unknown error",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      // Store for later upload (new expense)
      onFileSelect?.(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDelete = () => {
    if (expenseId && currentReceiptPath) {
      deleteReceipt(expenseId, {
        onSuccess: () => {
          toast({ title: "Receipt deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete receipt", variant: "destructive" });
        },
      });
    } else if (pendingFile) {
      onFileSelect?.(null);
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <Image className="h-5 w-5 text-blue-500" />;
  };

  const isLoading = isUploading || isDeleting;
  const hasReceipt = currentReceiptUrl || pendingFile;

  return (
    <div className="space-y-2">
      <Label>Receipt</Label>

      {hasReceipt ? (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          {getFileIcon(pendingFile?.type || currentReceiptPath)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {pendingFile?.name || currentReceiptPath?.split('/').pop() || 'Receipt'}
            </p>
            {pendingFile && (
              <p className="text-xs text-muted-foreground">
                {(pendingFile.size / 1024).toFixed(1)} KB - Ready to upload
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {currentReceiptUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(currentReceiptUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          {isLoading ? (
            <Loader2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Uploading...' : 'Drop receipt here or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPEG, PNG, WebP, or PDF (max 10MB)
          </p>
        </div>
      )}
    </div>
  );
}
