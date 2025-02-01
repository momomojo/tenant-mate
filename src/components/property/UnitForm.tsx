import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Control, Controller } from "react-hook-form";

interface UnitFormProps {
  unit: any;
  control: Control<UnitFormData>;
  isSubmitting: boolean;
}

export interface UnitFormData {
  unit_number: string;
  monthly_rent: number;
  status: string;
}

export function UnitForm({ unit, control, isSubmitting }: UnitFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="unit_number">Unit Number</Label>
        <Controller
          name="unit_number"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Input
              id="unit_number"
              placeholder="Enter unit number"
              {...field}
            />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monthly_rent">Monthly Rent</Label>
        <Controller
          name="monthly_rent"
          control={control}
          rules={{ required: true, min: 0 }}
          render={({ field }) => (
            <Input
              id="monthly_rent"
              type="number"
              placeholder="Enter monthly rent"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Controller
          name="status"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
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
          )}
        />
      </div>
    </div>
  );
}