import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Property {
  id: string;
  name: string;
  address: string;
  property_type: string | null;
}

interface EditPropertyDialogProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onPropertyUpdated: () => void;
}

interface PropertyFormData {
  name: string;
  address: string;
  property_type: string;
}

const propertyTypes = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed", label: "Mixed Use" },
];

export function EditPropertyDialog({
  property,
  isOpen,
  onClose,
  onPropertyUpdated,
}: EditPropertyDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<PropertyFormData>({
    defaultValues: {
      name: property.name,
      address: property.address,
      property_type: property.property_type || "residential",
    },
  });

  const propertyType = watch("property_type");

  const onSubmit = async (data: PropertyFormData) => {
    try {
      const { error } = await supabase
        .from("properties")
        .update({
          name: data.name,
          address: data.address,
          property_type: data.property_type,
        })
        .eq("id", property.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

      onPropertyUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: "Failed to update property. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Property name is required" })}
              placeholder="Enter property name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register("address", { required: "Address is required" })}
              placeholder="Enter property address"
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_type">Property Type</Label>
            <Select
              value={propertyType}
              onValueChange={(value) => setValue("property_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
