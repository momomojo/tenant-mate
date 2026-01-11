import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ApplicantFiltersProps {
  propertyId: string;
  onPropertyChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "invited", label: "Invited" },
  { value: "started", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "screening", label: "Screening" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "converted", label: "Converted" },
];

export function ApplicantFilters({
  propertyId,
  onPropertyChange,
  status,
  onStatusChange,
  search,
  onSearchChange,
}: ApplicantFiltersProps) {
  const { user } = useAuthenticatedUser();

  const { data: properties } = useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .or(`created_by.eq.${user.id},property_manager_id.eq.${user.id}`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search applicants..."
          className="pl-9"
        />
      </div>

      <Select value={propertyId} onValueChange={onPropertyChange}>
        <SelectTrigger className="w-full sm:w-48">
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
        <SelectTrigger className="w-full sm:w-40">
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
