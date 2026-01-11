import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInviteApplicant } from "@/hooks/useApplicants";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";

interface InviteApplicantDialogProps {
  defaultPropertyId?: string;
  onSuccess?: () => void;
}

export function InviteApplicantDialog({ defaultPropertyId, onSuccess }: InviteApplicantDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(defaultPropertyId || "");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const { user } = useAuthenticatedUser();
  const { toast } = useToast();
  const { mutateAsync: inviteApplicant, isPending } = useInviteApplicant();

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address")
        .or(`created_by.eq.${user.id},property_manager_id.eq.${user.id}`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  // Fetch units for selected property
  const { data: units } = useQuery({
    queryKey: ["property-units", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, status")
        .eq("property_id", selectedProperty)
        .in("status", ["vacant", "available"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProperty,
  });

  const resetForm = () => {
    if (!defaultPropertyId) setSelectedProperty("");
    setSelectedUnit("");
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProperty || !email) {
      toast({
        title: "Missing required fields",
        description: "Please select a property and enter an email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      await inviteApplicant({
        propertyId: selectedProperty,
        unitId: selectedUnit || undefined,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
      });

      toast({
        title: "Applicant invited",
        description: `An invitation has been sent to ${email}`,
      });

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to invite applicant. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Applicant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Applicant</DialogTitle>
          <DialogDescription>
            Send an application invitation to a potential tenant
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="property">Property *</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger id="property">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit (optional)</Label>
            <Select
              value={selectedUnit}
              onValueChange={setSelectedUnit}
              disabled={!selectedProperty}
            >
              <SelectTrigger id="unit">
                <SelectValue placeholder={selectedProperty ? "Select a unit" : "Select a property first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific unit</SelectItem>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    Unit {unit.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="applicant@email.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
