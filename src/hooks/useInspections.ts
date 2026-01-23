import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InspectionType = "move_in" | "move_out" | "routine" | "maintenance" | "annual";
export type InspectionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type ConditionRating = "excellent" | "good" | "fair" | "poor" | "damaged" | "missing";

export interface InspectionItem {
  id: string;
  inspection_id: string;
  room: string;
  item: string;
  condition: ConditionRating | null;
  notes: string | null;
  estimated_repair_cost: number | null;
  charge_to_tenant: boolean;
  created_at: string;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  storage_path: string;
  caption: string | null;
  room: string | null;
  taken_at: string;
  uploaded_by: string | null;
}

export interface Inspection {
  id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string | null;
  created_by: string | null;
  inspection_type: InspectionType;
  scheduled_date: string | null;
  completed_date: string | null;
  status: InspectionStatus;
  overall_condition: ConditionRating | null;
  inspector_notes: string | null;
  tenant_comments: string | null;
  inspector_signature_date: string | null;
  tenant_signature_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  property?: {
    id: string;
    name: string;
    address: string;
  };
  unit?: {
    id: string;
    unit_number: string;
  };
  tenant?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  items?: InspectionItem[];
  photos?: InspectionPhoto[];
}

export interface InspectionFilters {
  propertyId?: string;
  unitId?: string;
  type?: InspectionType;
  status?: InspectionStatus;
}

export interface CreateInspectionInput {
  property_id: string;
  unit_id: string;
  tenant_id?: string | null;
  inspection_type: InspectionType;
  scheduled_date?: string;
  status?: InspectionStatus;
  inspector_notes?: string;
}

export interface UpdateInspectionInput extends Partial<CreateInspectionInput> {
  id: string;
  completed_date?: string;
  overall_condition?: ConditionRating;
  tenant_comments?: string;
}

export const inspectionTypeConfig: Record<InspectionType, { label: string; color: string }> = {
  move_in: { label: "Move-In", color: "bg-green-600" },
  move_out: { label: "Move-Out", color: "bg-red-600" },
  routine: { label: "Routine", color: "bg-blue-600" },
  maintenance: { label: "Maintenance", color: "bg-yellow-600" },
  annual: { label: "Annual", color: "bg-purple-600" },
};

export const inspectionStatusConfig: Record<InspectionStatus, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-600" },
  in_progress: { label: "In Progress", color: "bg-yellow-600" },
  completed: { label: "Completed", color: "bg-green-600" },
  cancelled: { label: "Cancelled", color: "bg-gray-600" },
};

export const conditionConfig: Record<ConditionRating, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "bg-green-600" },
  good: { label: "Good", color: "bg-blue-600" },
  fair: { label: "Fair", color: "bg-yellow-600" },
  poor: { label: "Poor", color: "bg-orange-600" },
  damaged: { label: "Damaged", color: "bg-red-600" },
  missing: { label: "Missing", color: "bg-gray-600" },
};

export const defaultRooms = [
  "living_room",
  "kitchen",
  "bathroom",
  "bedroom_1",
  "bedroom_2",
  "bedroom_3",
  "dining_room",
  "hallway",
  "garage",
  "exterior",
  "patio",
  "laundry",
];

export const defaultItems = [
  "walls",
  "ceiling",
  "floors",
  "windows",
  "doors",
  "light_fixtures",
  "electrical_outlets",
  "hvac_vents",
  "closets",
  "appliances",
  "plumbing",
  "cabinets",
];

export function useInspections(filters?: InspectionFilters) {
  return useQuery({
    queryKey: ["inspections", filters],
    queryFn: async () => {
      let query = supabase
        .from("inspections")
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number),
          tenant:profiles!inspections_tenant_id_fkey(id, first_name, last_name, email)
        `)
        .order("scheduled_date", { ascending: false });

      if (filters?.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }

      if (filters?.unitId) {
        query = query.eq("unit_id", filters.unitId);
      }

      if (filters?.type) {
        query = query.eq("inspection_type", filters.type);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Inspection[];
    },
  });
}

export function useInspection(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ["inspection", inspectionId],
    queryFn: async () => {
      if (!inspectionId) throw new Error("Inspection ID required");

      const { data, error } = await supabase
        .from("inspections")
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number),
          tenant:profiles!inspections_tenant_id_fkey(id, first_name, last_name, email),
          items:inspection_items(*),
          photos:inspection_photos(*)
        `)
        .eq("id", inspectionId)
        .single();

      if (error) throw error;
      return data as Inspection;
    },
    enabled: !!inspectionId,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("inspections")
        .insert({
          ...input,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateInspectionInput) => {
      const { data, error } = await supabase
        .from("inspections")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection", variables.id] });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from("inspections")
        .delete()
        .eq("id", inspectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
  });
}

// Inspection Items
export function useCreateInspectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      inspection_id: string;
      room: string;
      item: string;
      condition?: ConditionRating;
      notes?: string;
      estimated_repair_cost?: number;
      charge_to_tenant?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("inspection_items")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inspection", variables.inspection_id],
      });
    },
  });
}

export function useUpdateInspectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      inspection_id: string;
      condition?: ConditionRating;
      notes?: string;
      estimated_repair_cost?: number;
      charge_to_tenant?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("inspection_items")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inspection", variables.inspection_id],
      });
    },
  });
}

export function useInspectionCounts(propertyId?: string) {
  return useQuery({
    queryKey: ["inspectionCounts", propertyId],
    queryFn: async () => {
      let query = supabase.from("inspections").select("status");

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const counts = {
        total: data?.length || 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      data?.forEach((i) => {
        const status = i.status as InspectionStatus;
        if (status in counts) {
          counts[status]++;
        }
      });

      return counts;
    },
  });
}
