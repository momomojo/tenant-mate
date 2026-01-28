import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UploadReceiptInput {
  expenseId: string;
  file: File;
}

export function useUploadExpenseReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, file }: UploadReceiptInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${expenseId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(fileName);

      // Update expense with receipt path
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          receipt_path: fileName,
          receipt_url: urlData.publicUrl,
        })
        .eq('id', expenseId);

      if (updateError) throw updateError;

      return { path: fileName, url: urlData.publicUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense", variables.expenseId] });
    },
  });
}

export function useDeleteExpenseReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      // Get current receipt path
      const { data: expense, error: fetchError } = await supabase
        .from('expenses')
        .select('receipt_path')
        .eq('id', expenseId)
        .single();

      if (fetchError) throw fetchError;
      if (!expense?.receipt_path) return;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('expense-receipts')
        .remove([expense.receipt_path]);

      if (deleteError) throw deleteError;

      // Update expense record
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          receipt_path: null,
          receipt_url: null,
        })
        .eq('id', expenseId);

      if (updateError) throw updateError;
    },
    onSuccess: (_, expenseId) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    },
  });
}

export async function getExpenseReceiptUrl(receiptPath: string): Promise<string | null> {
  if (!receiptPath) return null;

  const { data } = supabase.storage
    .from('expense-receipts')
    .getPublicUrl(receiptPath);

  return data.publicUrl;
}
