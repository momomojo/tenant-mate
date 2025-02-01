import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface TenantProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface AssignTenantDialogProps {
  unit: any;
  tenants: TenantProfile[];
  isOpen: boolean;
  onClose: () => void;
  onTenantAssigned: () => void;
}

export function AssignTenantDialog({
  unit,
  tenants,
  isOpen,
  onClose,
  onTenantAssigned,
}: AssignTenantDialogProps) {
  const { toast } = useToast();
  const [selectedLeaseStartDate, setSelectedLeaseStartDate] = useState<Date>();
  const [selectedLeaseEndDate, setSelectedLeaseEndDate] = useState<Date>();
  const { reset } = useForm();

  const formatTenantLabel = (tenant: TenantProfile): string => {
    if (!tenant) return "-";
    const name = [tenant.first_name, tenant.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || tenant.email || "-";
  };

  const handleAssignTenant = async (formData: FormData) => {
    try {
      if (!selectedLeaseStartDate || !selectedLeaseEndDate) {
        toast({
          title: "Error",
          description: "Please select both lease start and end dates",
          variant: "destructive",
        });
        return;
      }

      const tenant_id = formData.get("tenant_id") as string;

      // Check if tenant already has an active lease for this unit
      const { data: existingLease, error: checkError } = await supabase
        .from("tenant_units")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("unit_id", unit.id)
        .eq("status", "active")
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLease) {
        toast({
          title: "Error",
          description: "This tenant already has an active lease for this unit",
          variant: "destructive",
        });
        return;
      }

      // Create tenant unit assignment
      const { error: assignError } = await supabase.from("tenant_units").insert({
        tenant_id: tenant_id,
        unit_id: unit.id,
        lease_start_date: format(selectedLeaseStartDate, "yyyy-MM-dd"),
        lease_end_date: format(selectedLeaseEndDate, "yyyy-MM-dd"),
        status: "active",
      });

      if (assignError) throw assignError;

      // Update unit status
      const { error: unitError } = await supabase
        .from("units")
        .update({ status: "occupied" })
        .eq("id", unit.id);

      if (unitError) throw unitError;

      toast({
        title: "Success",
        description: "Tenant assigned successfully",
      });

      onClose();
      reset();
      setSelectedLeaseStartDate(undefined);
      setSelectedLeaseEndDate(undefined);
      onTenantAssigned();
    } catch (error) {
      console.error("Error assigning tenant:", error);
      toast({
        title: "Error",
        description: "Failed to assign tenant. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Tenant to Unit {unit?.unit_number}</DialogTitle>
          <DialogDescription>
            Select a tenant and set the lease period to assign them to this unit.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAssignTenant(formData);
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="tenant_id">Select Tenant</Label>
            <Select name="tenant_id" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatTenantLabel(tenant)}
                      </span>
                      {tenant.email && (
                        <span className="text-xs text-gray-500">
                          {tenant.email}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lease Start Date</Label>
            <div className="border rounded-md p-2">
              <Calendar
                mode="single"
                selected={selectedLeaseStartDate}
                onSelect={setSelectedLeaseStartDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lease End Date</Label>
            <div className="border rounded-md p-2">
              <Calendar
                mode="single"
                selected={selectedLeaseEndDate}
                onSelect={setSelectedLeaseEndDate}
                disabled={(date) =>
                  !selectedLeaseStartDate || date <= selectedLeaseStartDate
                }
                initialFocus
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedLeaseStartDate || !selectedLeaseEndDate}
            >
              Assign Tenant
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}