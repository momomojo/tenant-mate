import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddUnitForm {
  unit_number: string;
  monthly_rent: number;
}

interface AddUnitDialogProps {
  propertyId: string;
  onUnitAdded: () => void;
}

export function AddUnitDialog({ propertyId, onUnitAdded }: AddUnitDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AddUnitForm>();

  const onSubmit = async (data: AddUnitForm) => {
    try {
      const { error } = await supabase.from("units").insert({
        property_id: propertyId,
        unit_number: data.unit_number,
        monthly_rent: data.monthly_rent,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unit added successfully",
      });

      reset();
      setIsOpen(false);
      onUnitAdded();
    } catch (error) {
      console.error("Error adding unit:", error);
      toast({
        title: "Error",
        description: "Failed to add unit. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unit_number">Unit Number</Label>
            <Input
              id="unit_number"
              placeholder="Enter unit number"
              {...register("unit_number", { required: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_rent">Monthly Rent</Label>
            <Input
              id="monthly_rent"
              type="number"
              placeholder="Enter monthly rent"
              {...register("monthly_rent", {
                required: true,
                valueAsNumber: true,
              })}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Unit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}