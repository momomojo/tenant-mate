import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthenticatedUser } from "./useAuthenticatedUser";

export interface Lease {
  id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  template_id: string | null;
  status: 'draft' | 'pending' | 'signed' | 'active' | 'expired' | 'terminated' | 'renewed';
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number;
  late_fee: number;
  grace_period_days: number;
  pet_deposit: number;
  pet_rent: number;
  content: string | null;
  signature_provider: string | null;
  signature_request_id: string | null;
  signature_status: 'not_sent' | 'sent' | 'viewed' | 'partially_signed' | 'completed' | 'declined' | 'expired';
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  signed_document_url: string | null;
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
    email: string | null;
  };
}

export interface LeaseTemplate {
  id: string;
  name: string;
  description: string | null;
  state: string | null;
  content: string;
  variables: Array<{ key: string; label: string; type: string }>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface LeasesFilters {
  propertyId?: string;
  tenantId?: string;
  status?: string;
}

export function useLeases(filters: LeasesFilters = {}) {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["leases", user?.id, filters],
    queryFn: async (): Promise<Lease[]> => {
      if (!user) return [];

      let query = supabase
        .from("leases")
        .select(`
          *,
          property:properties!inner(id, name, address, created_by, property_manager_id),
          unit:units(id, unit_number),
          tenant:profiles!leases_tenant_id_fkey(id, first_name, last_name, email)
        `)
        .or(`created_by.eq.${user.id},property_manager_id.eq.${user.id}`, { referencedTable: 'property' })
        .order("created_at", { ascending: false });

      if (filters.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }

      if (filters.tenantId) {
        query = query.eq("tenant_id", filters.tenantId);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Lease[];
    },
    enabled: !!user,
  });
}

export function useLease(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease", leaseId],
    queryFn: async (): Promise<Lease | null> => {
      if (!leaseId) return null;

      const { data, error } = await supabase
        .from("leases")
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number),
          tenant:profiles!leases_tenant_id_fkey(id, first_name, last_name, email)
        `)
        .eq("id", leaseId)
        .single();

      if (error) {
        throw error;
      }

      return data as Lease;
    },
    enabled: !!leaseId,
  });
}

export function useLeaseTemplates() {
  return useQuery({
    queryKey: ["lease-templates"],
    queryFn: async (): Promise<LeaseTemplate[]> => {
      const { data, error } = await supabase
        .from("lease_templates")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false });

      if (error) {
        throw error;
      }

      return data as LeaseTemplate[];
    },
  });
}

interface CreateLeaseInput {
  propertyId: string;
  unitId: string;
  tenantId: string;
  templateId?: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  securityDeposit?: number;
  lateFee?: number;
  gracePeriodDays?: number;
  petDeposit?: number;
  petRent?: number;
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  const { user } = useAuthenticatedUser();

  return useMutation({
    mutationFn: async (input: CreateLeaseInput): Promise<Lease> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("leases")
        .insert({
          property_id: input.propertyId,
          unit_id: input.unitId,
          tenant_id: input.tenantId,
          template_id: input.templateId || null,
          lease_start: input.leaseStart,
          lease_end: input.leaseEnd,
          monthly_rent: input.monthlyRent,
          security_deposit: input.securityDeposit || 0,
          late_fee: input.lateFee || 50,
          grace_period_days: input.gracePeriodDays || 5,
          pet_deposit: input.petDeposit || 0,
          pet_rent: input.petRent || 0,
          status: "draft",
          created_by: user.id,
        })
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number),
          tenant:profiles!leases_tenant_id_fkey(id, first_name, last_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      return data as Lease;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["lease-counts"] });
    },
  });
}

interface UpdateLeaseInput {
  leaseId: string;
  status?: Lease["status"];
  content?: string;
  signatureStatus?: Lease["signature_status"];
  signatureProvider?: string;
  signatureRequestId?: string;
}

export function useUpdateLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLeaseInput): Promise<Lease> => {
      const updates: Record<string, unknown> = {};

      if (input.status) updates.status = input.status;
      if (input.content !== undefined) updates.content = input.content;
      if (input.signatureStatus) updates.signature_status = input.signatureStatus;
      if (input.signatureProvider) updates.signature_provider = input.signatureProvider;
      if (input.signatureRequestId) updates.signature_request_id = input.signatureRequestId;

      const { data, error } = await supabase
        .from("leases")
        .update(updates)
        .eq("id", input.leaseId)
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number),
          tenant:profiles!leases_tenant_id_fkey(id, first_name, last_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      return data as Lease;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["lease", variables.leaseId] });
      queryClient.invalidateQueries({ queryKey: ["lease-counts"] });
    },
  });
}

export function useSendForSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leaseId, signerEmail, signerName }: { leaseId: string; signerEmail: string; signerName: string }) => {
      const response = await supabase.functions.invoke("dropbox-sign-send-request", {
        body: { leaseId, signerEmail, signerName, testMode: true },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["lease", variables.leaseId] });
      queryClient.invalidateQueries({ queryKey: ["lease-counts"] });
    },
  });
}

export function useGetSignUrl() {
  return useMutation({
    mutationFn: async (signatureId: string) => {
      const response = await supabase.functions.invoke("dropbox-sign-get-sign-url", {
        body: { signatureId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data as { signUrl: string; expiresAt: number };
    },
  });
}

export function useDeleteLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leaseId: string) => {
      const { error } = await supabase
        .from("leases")
        .delete()
        .eq("id", leaseId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["lease-counts"] });
    },
  });
}

export function useLeaseCounts(propertyId?: string) {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["lease-counts", user?.id, propertyId],
    queryFn: async () => {
      if (!user) return {};

      let query = supabase
        .from("leases")
        .select(`
          status,
          property:properties!inner(created_by, property_manager_id)
        `)
        .or(`created_by.eq.${user.id},property_manager_id.eq.${user.id}`, { referencedTable: 'property' });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;

      if (error) {
        return {};
      }

      const counts: Record<string, number> = {
        total: 0,
        draft: 0,
        pending: 0,
        signed: 0,
        active: 0,
        expired: 0,
        terminated: 0,
      };

      (data || []).forEach((l: { status: string; property: unknown }) => {
        counts.total++;
        if (counts[l.status] !== undefined) {
          counts[l.status]++;
        }
      });

      return counts;
    },
    enabled: !!user,
  });
}
