import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateConversation } from "@/hooks/useConversations";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
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
import { Plus, Loader2 } from "lucide-react";

interface NewConversationDialogProps {
  onConversationCreated?: (conversationId: string) => void;
}

export function NewConversationDialog({ onConversationCreated }: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [subject, setSubject] = useState("");

  const { user } = useAuthenticatedUser();
  const { mutateAsync: createConversation, isPending } = useCreateConversation();

  // Fetch properties for the landlord
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

  // Fetch tenants for the selected property
  const { data: tenants } = useQuery({
    queryKey: ["property-tenants", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const { data, error } = await supabase
        .from("tenant_units")
        .select(`
          tenant_id,
          unit_id,
          units!inner(
            id,
            unit_number,
            property_id
          ),
          tenant:profiles!tenant_units_tenant_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("units.property_id", selectedProperty)
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProperty,
  });

  const handleCreate = async () => {
    if (!selectedProperty || !selectedTenant) return;

    const tenantData = tenants?.find((t: any) => t.tenant_id === selectedTenant);

    try {
      const conversation = await createConversation({
        tenantId: selectedTenant,
        propertyId: selectedProperty,
        unitId: tenantData?.unit_id,
        subject: subject || undefined,
      });

      setOpen(false);
      setSelectedProperty("");
      setSelectedTenant("");
      setSubject("");

      if (onConversationCreated) {
        onConversationCreated(conversation.id);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a conversation with a tenant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
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
            <Label htmlFor="tenant">Tenant</Label>
            <Select
              value={selectedTenant}
              onValueChange={setSelectedTenant}
              disabled={!selectedProperty}
            >
              <SelectTrigger id="tenant">
                <SelectValue placeholder={selectedProperty ? "Select a tenant" : "Select a property first"} />
              </SelectTrigger>
              <SelectContent>
                {tenants?.map((tu: any) => (
                  <SelectItem key={tu.tenant_id} value={tu.tenant_id}>
                    {tu.tenant?.first_name} {tu.tenant?.last_name}
                    {tu.units?.unit_number && ` (Unit ${tu.units.unit_number})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProperty && !tenants?.length && (
              <p className="text-sm text-muted-foreground">
                No tenants found for this property
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedProperty || !selectedTenant || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Start Conversation"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
