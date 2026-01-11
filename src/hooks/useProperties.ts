import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthenticatedUser } from "./useAuthenticatedUser";

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  property_type: string | null;
  created_by: string;
  property_manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useProperties() {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async (): Promise<Property[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .or(`created_by.eq.${user.id},property_manager_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching properties:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user,
  });
}

export function useProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property", propertyId],
    queryFn: async (): Promise<Property | null> => {
      if (!propertyId) return null;

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (error) {
        console.error("Error fetching property:", error);
        throw error;
      }

      return data;
    },
    enabled: !!propertyId,
  });
}

interface CreatePropertyInput {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { user } = useAuthenticatedUser();

  return useMutation({
    mutationFn: async (input: CreatePropertyInput): Promise<Property> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("properties")
        .insert({
          name: input.name,
          address: input.address,
          city: input.city || null,
          state: input.state || null,
          zip_code: input.zipCode || null,
          property_type: input.propertyType || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating property:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
