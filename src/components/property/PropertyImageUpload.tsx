import { useState, useRef, useCallback } from "react";
import {
  usePropertyImages,
  useUploadPropertyImage,
  useDeletePropertyImage,
  useUpdatePropertyImage,
  getPropertyImageUrl,
} from "@/hooks/usePropertyImages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import {
  ImagePlus,
  Trash2,
  Star,
  Upload,
  Loader2,
  X,
  GripVertical,
} from "lucide-react";

interface PropertyImageUploadProps {
  propertyId: string;
}

export function PropertyImageUpload({ propertyId }: PropertyImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const { data: images, isLoading } = usePropertyImages(propertyId);
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadPropertyImage();
  const { mutate: deleteImage, isPending: isDeleting } = useDeletePropertyImage();
  const { mutate: updateImage } = useUpdatePropertyImage();

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const maxSize = 10 * 1024 * 1024; // 10MB

      for (const file of Array.from(files)) {
        if (!validTypes.includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a valid image. Use JPEG, PNG, WebP, or GIF.`,
            variant: "destructive",
          });
          continue;
        }

        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit.`,
            variant: "destructive",
          });
          continue;
        }

        try {
          // Make first image primary if no images exist
          const isPrimary = !images || images.length === 0;
          await uploadImage({ propertyId, file, isPrimary });
          toast({
            title: "Image uploaded",
            description: `${file.name} has been uploaded successfully.`,
          });
        } catch (error) {
          console.error("Upload error:", error);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}. Please try again.`,
            variant: "destructive",
          });
        }
      }
    },
    [propertyId, images, uploadImage, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSetPrimary = (imageId: string) => {
    updateImage(
      { imageId, propertyId, isPrimary: true },
      {
        onSuccess: () => {
          toast({
            title: "Primary image updated",
            description: "The primary image has been changed.",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (imageToDelete) {
      deleteImage(
        { imageId: imageToDelete, propertyId },
        {
          onSuccess: () => {
            toast({
              title: "Image deleted",
              description: "The image has been removed.",
            });
            setDeleteDialogOpen(false);
            setImageToDelete(null);
          },
          onError: () => {
            toast({
              title: "Delete failed",
              description: "Failed to delete image. Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Property Images</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4 mr-2" />
            )}
            Add Images
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {/* Upload drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-primary/50"}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isUploading ? (
              "Uploading..."
            ) : (
              <>
                Drag and drop images here, or <span className="text-primary">browse</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPEG, PNG, WebP, or GIF up to 10MB
          </p>
        </div>

        {/* Image grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : images && images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={getPropertyImageUrl(image.storage_path)}
                  alt={image.alt_text || image.file_name || "Property image"}
                  className="w-full h-full object-cover"
                />

                {/* Primary badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Primary
                  </div>
                )}

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.is_primary && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetPrimary(image.id)}
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setImageToDelete(image.id);
                      setDeleteDialogOpen(true);
                    }}
                    title="Delete image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ImagePlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No images yet</p>
            <p className="text-sm">Upload images to showcase your property</p>
          </div>
        )}
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
