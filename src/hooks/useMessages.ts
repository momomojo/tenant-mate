import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthenticatedUser } from "./useAuthenticatedUser";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  attachment_url: string | null;
  attachment_name: string | null;
  read_at: string | null;
  created_at: string;
  // Joined data
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuthenticatedUser();
  const queryClient = useQueryClient();

  // Main query for messages
  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, first_name, last_name)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data: newMessage } = await supabase
            .from("messages")
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, first_name, last_name)
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMessage) {
            queryClient.setQueryData<Message[]>(
              ["messages", conversationId],
              (old = []) => [...old, newMessage as Message]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

interface SendMessageInput {
  conversationId: string;
  content: string;
  messageType?: "text" | "image" | "file";
  attachmentUrl?: string;
  attachmentName?: string;
}

export function useSendMessage() {
  const { user } = useAuthenticatedUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendMessageInput): Promise<Message> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: input.conversationId,
          sender_id: user.id,
          content: input.content,
          message_type: input.messageType || "text",
          attachment_url: input.attachmentUrl || null,
          attachment_name: input.attachmentName || null,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, first_name, last_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      return data as Message;
    },
    onSuccess: (newMessage) => {
      // Optimistically update messages list
      queryClient.setQueryData<Message[]>(
        ["messages", newMessage.conversation_id],
        (old = []) => {
          // Avoid duplicates from real-time subscription
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, newMessage];
        }
      );
      // Invalidate conversations to update last_message
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkMessagesRead() {
  const { user } = useAuthenticatedUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Call the database function to mark messages as read
      const { error } = await supabase.rpc("mark_messages_read", {
        p_conversation_id: conversationId,
        p_user_id: user.id,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, conversationId) => {
      // Update local messages to show as read
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      // Update unread counts
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useUploadMessageAttachment() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ url: string; name: string }> => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `message-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        name: file.name,
      };
    },
  });
}
