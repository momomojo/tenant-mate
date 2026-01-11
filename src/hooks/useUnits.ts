import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  rent_amount: number | null;
  status: "available" | "occupied" | "maintenance";
  created_at: string;
  updated_at: string;
}

export function useUnits(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["units", propertyId],
    queryFn: async (): Promise<Unit[]> => {
      if (!propertyId) return [];

      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("property_id", propertyId)
        .order("unit_number");

      if (error) {
        console.error("Error fetching units:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!propertyId,
  });
}

export function useUnit(unitId: string | undefined) {
  return useQuery({
    queryKey: ["unit", unitId],
    queryFn: async (): Promise<Unit | null> => {
      if (!unitId) return null;

      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("id", unitId)
        .single();

      if (error) {
        console.error("Error fetching unit:", error);
        throw error;
      }

      return data;
    },
    enabled: !!unitId,
  });
}

interface CreateUnitInput {
  propertyId: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  rentAmount?: number;
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUnitInput): Promise<Unit> => {
      const { data, error } = await supabase
        .from("units")
        .insert({
          property_id: input.propertyId,
          unit_number: input.unitNumber,
          bedrooms: input.bedrooms || null,
          bathrooms: input.bathrooms || null,
          square_feet: input.squareFeet || null,
          rent_amount: input.rentAmount || null,
          status: "available",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating unit:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["units", variables.propertyId] });
    },
  });
}

interface UpdateUnitInput {
  unitId: string;
  propertyId: string;
  unitNumber?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  rentAmount?: number;
  status?: Unit["status"];
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUnitInput): Promise<Unit> => {
      const updates: Record<string, unknown> = {};

      if (input.unitNumber !== undefined) updates.unit_number = input.unitNumber;
      if (input.bedrooms !== undefined) updates.bedrooms = input.bedrooms;
      if (input.bathrooms !== undefined) updates.bathrooms = input.bathrooms;
      if (input.squareFeet !== undefined) updates.square_feet = input.squareFeet;
      if (input.rentAmount !== undefined) updates.rent_amount = input.rentAmount;
      if (input.status !== undefined) updates.status = input.status;

      const { data, error } = await supabase
        .from("units")
        .update(updates)
        .eq("id", input.unitId)
        .select()
        .single();

      if (error) {
        console.error("Error updating unit:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["units", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["unit", variables.unitId] });
    },
  });
}
