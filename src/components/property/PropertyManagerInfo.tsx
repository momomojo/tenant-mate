import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface PropertyManagerInfoProps {
  property: any;
  onUpdate: () => void;
}

export function PropertyManagerInfo({ property, onUpdate }: PropertyManagerInfoProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState(property.property_manager_id);

  const { data: propertyManagers } = useQuery({
    queryKey: ["propertyManagers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("role", "property_manager")
        .order("first_name");

      if (error) throw error;
      return data;
    },
  });

  const formatManagerName = (manager: any) => {
    if (!manager) return "Not assigned";
    return `${manager.first_name || ''} ${manager.last_name || ''} (${manager.email})`.trim();
  };

  const handleUpdateManager = async () => {
    try {
      const { error } = await supabase
        .from("properties")
        .update({ property_manager_id: selectedManagerId })
        .eq("id", property.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property manager updated successfully",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating property manager:", error);
      toast({
        title: "Error",
        description: "Failed to update property manager",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-[#403E43] border-none">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white">
          Property Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400">Created by</p>
            <p className="text-white">{formatManagerName(property.creator)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Current Property Manager</p>
            {isEditing ? (
              <div className="space-y-2">
                <Select
                  value={selectedManagerId}
                  onValueChange={setSelectedManagerId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a property manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyManagers?.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {formatManagerName(manager)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateManager}>Save</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-white">
                  {formatManagerName(property.property_manager)}
                </p>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Change Manager
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}