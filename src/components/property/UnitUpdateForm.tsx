import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { UnitForm, UnitFormData } from "./UnitForm";
import { CurrentTenant } from "./CurrentTenant";
import { DialogActions } from "./DialogActions";
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
import { Trash2 } from "lucide-react";
import type { UnitWithTenant, TenantProfile } from "@/types";
import { formatTenantLabel } from "@/types";

interface TenantUnitWithProfile {
  id: string;
  status: string | null;
  profiles?: TenantProfile | null;
}

interface UnitUpdateFormProps {
  unit: UnitWithTenant;
  onClose: () => void;
  onUnitUpdated: () => void;
}

export function UnitUpdateForm({ unit, onClose, onUnitUpdated }: UnitUpdateFormProps) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { handleSubmit, formState: { isSubmitting }, control } = useForm<UnitFormData>({
    defaultValues: {
      unit_number: unit?.unit_number || "",
      monthly_rent: unit?.monthly_rent || 0,
      status: unit?.status || "vacant",
    },
  });

  const handleDeleteUnit = async () => {
    setIsDeleting(true);
    try {
      // First delete any tenant_units
      const { error: tenantUnitError } = await supabase
        .from("tenant_units")
        .delete()
        .eq("unit_id", unit.id);

      if (tenantUnitError) throw tenantUnitError;

      // Then delete the unit
      const { error: unitError } = await supabase
        .from("units")
        .delete()
        .eq("id", unit.id);

      if (unitError) throw unitError;

      toast({
        title: "Success",
        description: "Unit deleted successfully",
      });

      onClose();
      onUnitUpdated();
    } catch (error) {
      console.error("Error deleting unit:", error);
      toast({
        title: "Error",
        description: "Failed to delete unit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEndLease = async (tenantUnitId: string) => {
    try {
      const { error: tenantUnitError } = await supabase
        .from("tenant_units")
        .update({ status: "ended" })
        .eq("id", tenantUnitId);

      if (tenantUnitError) throw tenantUnitError;

      const { error: unitError } = await supabase
        .from("units")
        .update({ status: "vacant" })
        .eq("id", unit.id);

      if (unitError) throw unitError;

      toast({
        title: "Success",
        description: "Lease ended successfully",
      });

      onClose();
      onUnitUpdated();
    } catch (error) {
      console.error("Error ending lease:", error);
      toast({
        title: "Error",
        description: "Failed to end lease. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: UnitFormData) => {
    try {
      const { error } = await supabase
        .from("units")
        .update({
          unit_number: data.unit_number,
          monthly_rent: data.monthly_rent,
          status: data.status,
        })
        .eq("id", unit.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unit updated successfully",
      });

      onClose();
      onUnitUpdated();
    } catch (error) {
      console.error("Error updating unit:", error);
      toast({
        title: "Error",
        description: "Failed to update unit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const activeTenantUnit = unit?.tenant_units?.find(
    (tu: TenantUnitWithProfile) => tu.status === "active"
  );

  const currentTenant = activeTenantUnit?.profiles || null;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <UnitForm
          unit={unit}
          control={control}
          isSubmitting={isSubmitting}
        />
        {activeTenantUnit && currentTenant && (
          <CurrentTenant
            tenant={currentTenant}
            onEndLease={() => handleEndLease(activeTenantUnit.id)}
            formatTenantLabel={formatTenantLabel}
          />
        )}
        <div className="pt-4 border-t space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 w-full justify-start"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Unit
          </Button>
          <DialogActions onClose={onClose} isSubmitting={isSubmitting} />
        </div>
      </form>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete unit "{unit.unit_number}"? This will also remove any tenant assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUnit}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Unit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}