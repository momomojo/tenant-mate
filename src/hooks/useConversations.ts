import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthenticatedUser } from "./useAuthenticatedUser";

export interface Conversation {
  id: string;
  property_id: string;
  unit_id: string | null;
  landlord_id: string;
  tenant_id: string;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  landlord_unread_count: number;
  tenant_unread_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  other_user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  property?: {
    name: string;
    address: string;
  };
  unit?: {
    unit_number: string;
  };
}

export function useConversations() {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          property:properties(name, address),
          unit:units(unit_number),
          landlord:profiles!conversations_landlord_id_fkey(id, first_name, last_name, email, avatar_url),
          tenant:profiles!conversations_tenant_id_fkey(id, first_name, last_name, email, avatar_url)
        `)
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }

      // Map to include other_user based on current user
      return (data || []).map((conv: any) => ({
        ...conv,
        other_user: conv.landlord_id === user.id ? conv.tenant : conv.landlord,
      }));
    },
    enabled: !!user,
  });
}

export function useConversation(conversationId: string | undefined) {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async (): Promise<Conversation | null> => {
      if (!conversationId || !user) return null;

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          property:properties(name, address),
          unit:units(unit_number),
          landlord:profiles!conversations_landlord_id_fkey(id, first_name, last_name, email, avatar_url),
          tenant:profiles!conversations_tenant_id_fkey(id, first_name, last_name, email, avatar_url)
        `)
        .eq("id", conversationId)
        .single();

      if (error) {
        console.error("Error fetching conversation:", error);
        throw error;
      }

      return {
        ...data,
        other_user: data.landlord_id === user.id ? data.tenant : data.landlord,
      } as Conversation;
    },
    enabled: !!conversationId && !!user,
  });
}

interface CreateConversationInput {
  tenantId: string;
  propertyId: string;
  unitId?: string;
  subject?: string;
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuthenticatedUser();

  return useMutation({
    mutationFn: async (input: CreateConversationInput): Promise<Conversation> => {
      if (!user) throw new Error("Not authenticated");

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .eq("landlord_id", user.id)
        .eq("tenant_id", input.tenantId)
        .eq("property_id", input.propertyId)
        .maybeSingle();

      if (existing) {
        // Unarchive if archived
        if (existing.is_archived) {
          await supabase
            .from("conversations")
            .update({ is_archived: false })
            .eq("id", existing.id);
        }
        return existing as Conversation;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          landlord_id: user.id,
          tenant_id: input.tenantId,
          property_id: input.propertyId,
          unit_id: input.unitId || null,
          subject: input.subject || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        throw error;
      }

      return data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ is_archived: true })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuthenticatedUser();

  return useQuery({
    queryKey: ["unread-count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      // Get user's role to know which count to sum
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isLandlord = profile?.role === "property_manager" || profile?.role === "landlord";

      const { data, error } = await supabase
        .from("conversations")
        .select(isLandlord ? "landlord_unread_count" : "tenant_unread_count")
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
        .eq("is_archived", false);

      if (error) {
        console.error("Error fetching unread count:", error);
        return 0;
      }

      const countField = isLandlord ? "landlord_unread_count" : "tenant_unread_count";
      return (data || []).reduce((sum, conv) => sum + (conv[countField] || 0), 0);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
