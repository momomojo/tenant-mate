import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";

interface UnitFormProps {
  unit: any;
  onSubmit: (data: UnitFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface UnitFormData {
  unit_number: string;
  monthly_rent: number;
  status: string;
}

export function UnitForm({ unit, onSubmit, isSubmitting }: UnitFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<UnitFormData>({
    defaultValues: {
      unit_number: unit?.unit_number,
      monthly_rent: unit?.monthly_rent,
      status: unit?.status || "vacant",
    },
  });

  return (
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
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          onValueChange={(value) => setValue("status", value)}
          defaultValue={unit?.status || "vacant"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}