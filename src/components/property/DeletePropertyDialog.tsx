import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface DeletePropertyDialogProps {
  propertyId: string;
  propertyName: string;
  isOpen: boolean;
  onClose: () => void;
  onPropertyDeleted: () => void;
}

export function DeletePropertyDialog({
  propertyId,
  propertyName,
  isOpen,
  onClose,
  onPropertyDeleted,
}: DeletePropertyDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // First, delete all related units (cascade will handle tenant_units)
      const { error: unitsError } = await supabase
        .from("units")
        .delete()
        .eq("property_id", propertyId);

      if (unitsError) throw unitsError;

      // Then delete the property
      const { error: propertyError } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (propertyError) throw propertyError;

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });

      onPropertyDeleted();
      onClose();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: "Failed to delete property. It may have associated data that must be removed first.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Property</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{propertyName}"? This will also delete all units associated with this property. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Property"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
