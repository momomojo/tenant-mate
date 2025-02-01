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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const { reset } = useForm();

  const formatTenantLabel = (tenant: TenantProfile): string => {
    if (!tenant) return "-";
    const name = [tenant.first_name, tenant.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || tenant.email || "-";
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedLeaseStartDate(date);
      setStartDateOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedLeaseEndDate(date);
      setEndDateOpen(false);
    }
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedLeaseStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedLeaseStartDate ? (
                    format(selectedLeaseStartDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align="start"
                onClick={handleCalendarClick}
              >
                <div onClick={handleCalendarClick}>
                  <Calendar
                    mode="single"
                    selected={selectedLeaseStartDate}
                    onSelect={handleStartDateSelect}
                    initialFocus
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Lease End Date</Label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedLeaseEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedLeaseEndDate ? (
                    format(selectedLeaseEndDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align="start"
                onClick={handleCalendarClick}
              >
                <div onClick={handleCalendarClick}>
                  <Calendar
                    mode="single"
                    selected={selectedLeaseEndDate}
                    onSelect={handleEndDateSelect}
                    initialFocus
                  />
                </div>
              </PopoverContent>
            </Popover>
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