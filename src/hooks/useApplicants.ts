import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthenticatedUser } from "./useAuthenticatedUser";

export interface Applicant {
  id: string;
  property_id: string;
  unit_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: 'invited' | 'started' | 'submitted' | 'screening' | 'approved' | 'rejected' | 'converted' | 'withdrawn';
  application_data: Record<string, unknown>;
  application_submitted_at: string | null;
  screening_order_id: string | null;
  screening_status: 'pending' | 'in_progress' | 'completed' | 'failed' | null;
  screening_completed_at: string | null;
  screening_provider: string | null;
  decision_notes: string | null;
  decided_by: string | null;
  decided_at: string | null;
  converted_tenant_id: string | null;
  converted_at: string | null;
  invited_by: string | null;
  invited_at: string;
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
}

interface ApplicantsFilters {
  propertyId?: string;
  status?: string;
  search?: string;
}

export function useApplicants(filters: ApplicantsFilters = {}) {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["applicants", user?.id, filters],
    queryFn: async (): Promise<Applicant[]> => {
      if (!user) return [];

      let query = supabase
        .from("applicants")
        .select(`
          *,
          property:properties!inner(id, name, address, created_by, property_manager_id),
          unit:units(id, unit_number)
        `)
        .or(`property.created_by.eq.${user.id},property.property_manager_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (filters.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching applicants:", error);
        throw error;
      }

      return data as Applicant[];
    },
    enabled: !!user,
  });
}

export function useApplicant(applicantId: string | undefined) {
  return useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: async (): Promise<Applicant | null> => {
      if (!applicantId) return null;

      const { data, error } = await supabase
        .from("applicants")
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number)
        `)
        .eq("id", applicantId)
        .single();

      if (error) {
        console.error("Error fetching applicant:", error);
        throw error;
      }

      return data as Applicant;
    },
    enabled: !!applicantId,
  });
}

interface InviteApplicantInput {
  propertyId: string;
  unitId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export function useInviteApplicant() {
  const queryClient = useQueryClient();
  const { user } = useAuthenticatedUser();

  return useMutation({
    mutationFn: async (input: InviteApplicantInput): Promise<Applicant> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("applicants")
        .insert({
          property_id: input.propertyId,
          unit_id: input.unitId || null,
          email: input.email,
          first_name: input.firstName || null,
          last_name: input.lastName || null,
          phone: input.phone || null,
          status: "invited",
          invited_by: user.id,
        })
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number)
        `)
        .single();

      if (error) {
        console.error("Error inviting applicant:", error);
        throw error;
      }

      // TODO: Send invitation email via Edge Function

      return data as Applicant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });
}

interface UpdateApplicantInput {
  applicantId: string;
  status?: Applicant["status"];
  decisionNotes?: string;
  applicationData?: Record<string, unknown>;
}

export function useUpdateApplicant() {
  const queryClient = useQueryClient();
  const { user } = useAuthenticatedUser();

  return useMutation({
    mutationFn: async (input: UpdateApplicantInput): Promise<Applicant> => {
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {};

      if (input.status) {
        updates.status = input.status;

        // Set decision info for approve/reject
        if (input.status === "approved" || input.status === "rejected") {
          updates.decided_by = user.id;
          updates.decided_at = new Date().toISOString();
        }
      }

      if (input.decisionNotes !== undefined) {
        updates.decision_notes = input.decisionNotes;
      }

      if (input.applicationData) {
        updates.application_data = input.applicationData;
      }

      const { data, error } = await supabase
        .from("applicants")
        .update(updates)
        .eq("id", input.applicantId)
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number)
        `)
        .single();

      if (error) {
        console.error("Error updating applicant:", error);
        throw error;
      }

      return data as Applicant;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant", variables.applicantId] });
    },
  });
}

export function useDeleteApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicantId: string) => {
      const { error } = await supabase
        .from("applicants")
        .delete()
        .eq("id", applicantId);

      if (error) {
        console.error("Error deleting applicant:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });
}

// Hook to trigger tenant screening via Edge Function
interface StartScreeningInput {
  applicantId: string;
  screeningType?: "credit" | "background" | "eviction" | "income" | "full";
}

export function useStartScreening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StartScreeningInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("tenant-screening", {
        body: {
          applicant_id: input.applicantId,
          screening_type: input.screeningType || "full",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Screening failed");
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant", variables.applicantId] });
    },
  });
}

// Helper hook to get applicant counts by status
export function useApplicantCounts(propertyId?: string) {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["applicant-counts", user?.id, propertyId],
    queryFn: async () => {
      if (!user) return {};

      let query = supabase
        .from("applicants")
        .select(`
          status,
          property:properties!inner(created_by, property_manager_id)
        `)
        .or(`property.created_by.eq.${user.id},property.property_manager_id.eq.${user.id}`);

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching applicant counts:", error);
        return {};
      }

      // Count by status
      const counts: Record<string, number> = {
        total: 0,
        invited: 0,
        started: 0,
        submitted: 0,
        screening: 0,
        approved: 0,
        rejected: 0,
        converted: 0,
      };

      (data || []).forEach((a: any) => {
        counts.total++;
        if (counts[a.status] !== undefined) {
          counts[a.status]++;
        }
      });

      return counts;
    },
    enabled: !!user,
  });
}
