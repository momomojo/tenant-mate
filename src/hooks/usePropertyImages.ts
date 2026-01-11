import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyImage {
  id: string;
  property_id: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  content_type: string | null;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
  created_at: string;
}

export function usePropertyImages(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property-images", propertyId],
    queryFn: async (): Promise<PropertyImage[]> => {
      if (!propertyId) return [];

      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("display_order");

      if (error) {
        console.error("Error fetching property images:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!propertyId,
  });
}

interface UploadImageInput {
  propertyId: string;
  file: File;
  isPrimary?: boolean;
  altText?: string;
}

export function useUploadPropertyImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadImageInput): Promise<PropertyImage> => {
      const { propertyId, file, isPrimary = false, altText } = input;

      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `property-images/${propertyId}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        throw uploadError;
      }

      // Get current max display order
      const { data: existingImages } = await supabase
        .from("property_images")
        .select("display_order")
        .eq("property_id", propertyId)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = existingImages?.[0]?.display_order !== undefined
        ? existingImages[0].display_order + 1
        : 0;

      // Create database record
      const { data, error } = await supabase
        .from("property_images")
        .insert({
          property_id: propertyId,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          content_type: file.type,
          display_order: nextOrder,
          is_primary: isPrimary,
          alt_text: altText || null,
        })
        .select()
        .single();

      if (error) {
        // Rollback: delete uploaded file
        await supabase.storage.from("property-images").remove([storagePath]);
        console.error("Error creating image record:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["property-images", variables.propertyId] });
    },
  });
}

interface UpdateImageInput {
  imageId: string;
  propertyId: string;
  isPrimary?: boolean;
  displayOrder?: number;
  altText?: string;
}

export function useUpdatePropertyImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateImageInput): Promise<PropertyImage> => {
      const updates: Record<string, unknown> = {};

      if (input.isPrimary !== undefined) updates.is_primary = input.isPrimary;
      if (input.displayOrder !== undefined) updates.display_order = input.displayOrder;
      if (input.altText !== undefined) updates.alt_text = input.altText;

      const { data, error } = await supabase
        .from("property_images")
        .update(updates)
        .eq("id", input.imageId)
        .select()
        .single();

      if (error) {
        console.error("Error updating image:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["property-images", variables.propertyId] });
    },
  });
}

export function useDeletePropertyImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, propertyId }: { imageId: string; propertyId: string }) => {
      // Get image record first to get storage path
      const { data: image, error: fetchError } = await supabase
        .from("property_images")
        .select("storage_path")
        .eq("id", imageId)
        .single();

      if (fetchError) {
        console.error("Error fetching image:", fetchError);
        throw fetchError;
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from("property_images")
        .delete()
        .eq("id", imageId);

      if (deleteError) {
        console.error("Error deleting image record:", deleteError);
        throw deleteError;
      }

      // Delete from storage
      if (image?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("property-images")
          .remove([image.storage_path]);

        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
          // Don't throw - record is already deleted
        }
      }

      return { propertyId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["property-images", result.propertyId] });
    },
  });
}

// Helper to get public URL for an image
export function getPropertyImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from("property-images").getPublicUrl(storagePath);
  return data.publicUrl;
}
