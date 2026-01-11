import { useProperties } from "@/hooks/useProperties";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface LeaseFiltersProps {
  propertyId: string;
  onPropertyChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Signature" },
  { value: "signed", label: "Signed" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
  { value: "renewed", label: "Renewed" },
];

export function LeaseFilters({
  propertyId,
  onPropertyChange,
  status,
  onStatusChange,
}: LeaseFiltersProps) {
  const { data: properties } = useProperties();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Select value={propertyId} onValueChange={onPropertyChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="All Properties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Properties</SelectItem>
          {properties?.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
