import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Calendar } from "@/components/ui/calendar";
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
  const [selectedTenantId, setSelectedTenantId] = useState<string>();
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

  const handleAssignTenant = async () => {
    try {
      if (!selectedTenantId || !selectedLeaseStartDate || !selectedLeaseEndDate) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const { data: existingLease, error: checkError } = await supabase
        .from("tenant_units")
        .select("*")
        .eq("tenant_id", selectedTenantId)
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

      const { error: assignError } = await supabase.from("tenant_units").insert({
        tenant_id: selectedTenantId,
        unit_id: unit.id,
        lease_start_date: format(selectedLeaseStartDate, "yyyy-MM-dd"),
        lease_end_date: format(selectedLeaseEndDate, "yyyy-MM-dd"),
        status: "active",
      });

      if (assignError) throw assignError;

      const { error: updateError } = await supabase
        .from("units")
        .update({ status: "occupied" })
        .eq("id", unit.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Tenant assigned successfully",
      });

      reset();
      onClose();
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
          <DialogTitle>Assign Tenant to Unit</DialogTitle>
          <DialogDescription>
            Select a tenant and set the lease period to assign them to this unit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tenant_id">Select Tenant</Label>
            <Select
              value={selectedTenantId}
              onValueChange={(value) => setSelectedTenantId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {formatTenantLabel(tenant)}
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
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                className="rounded-md border"
              />
            </div>
            {selectedLeaseStartDate && (
              <p className="text-sm text-muted-foreground">
                Selected: {format(selectedLeaseStartDate, "PPP")}
              </p>
            )}
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
                className="rounded-md border"
              />
            </div>
            {selectedLeaseEndDate && (
              <p className="text-sm text-muted-foreground">
                Selected: {format(selectedLeaseEndDate, "PPP")}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAssignTenant}>Assign Tenant</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}