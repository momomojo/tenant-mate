import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ExpenseCategory =
  | "repairs"
  | "utilities"
  | "taxes"
  | "insurance"
  | "management"
  | "mortgage"
  | "hoa"
  | "landscaping"
  | "cleaning"
  | "legal"
  | "advertising"
  | "supplies"
  | "other";

export interface Expense {
  id: string;
  property_id: string;
  unit_id: string | null;
  created_by: string | null;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  description: string | null;
  vendor: string | null;
  receipt_path: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  is_tax_deductible: boolean;
  tax_category: string | null;
  notes: string | null;
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

export interface ExpenseFilters {
  propertyId?: string;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateExpenseInput {
  property_id: string;
  unit_id?: string | null;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  description?: string;
  vendor?: string;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  is_tax_deductible?: boolean;
  notes?: string;
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
  id: string;
}

export const expenseCategoryConfig: Record<ExpenseCategory, { label: string; color: string }> = {
  repairs: { label: "Repairs & Maintenance", color: "bg-red-600" },
  utilities: { label: "Utilities", color: "bg-blue-600" },
  taxes: { label: "Property Taxes", color: "bg-yellow-600" },
  insurance: { label: "Insurance", color: "bg-green-600" },
  management: { label: "Management Fees", color: "bg-purple-600" },
  mortgage: { label: "Mortgage/Loan", color: "bg-indigo-600" },
  hoa: { label: "HOA Fees", color: "bg-pink-600" },
  landscaping: { label: "Landscaping", color: "bg-emerald-600" },
  cleaning: { label: "Cleaning", color: "bg-cyan-600" },
  legal: { label: "Legal Fees", color: "bg-orange-600" },
  advertising: { label: "Advertising", color: "bg-teal-600" },
  supplies: { label: "Supplies", color: "bg-amber-600" },
  other: { label: "Other", color: "bg-gray-600" },
};

export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number)
        `)
        .order("expense_date", { ascending: false });

      if (filters?.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      if (filters?.startDate) {
        query = query.gte("expense_date", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("expense_date", filters.endDate);
      }

      if (filters?.search) {
        query = query.or(
          `description.ilike.%${filters.search}%,vendor.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useExpense(expenseId: string | undefined) {
  return useQuery({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      if (!expenseId) throw new Error("Expense ID required");

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          property:properties(id, name, address),
          unit:units(id, unit_number)
        `)
        .eq("id", expenseId)
        .single();

      if (error) throw error;
      return data as Expense;
    },
    enabled: !!expenseId,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("expenses")
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
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenseSummary"] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateExpenseInput) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["expenseSummary"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenseSummary"] });
    },
  });
}

export function useExpenseSummary(propertyId?: string, year?: number) {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ["expenseSummary", propertyId, currentYear],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select("category, amount")
        .gte("expense_date", `${currentYear}-01-01`)
        .lte("expense_date", `${currentYear}-12-31`);

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by category
      const byCategory: Record<ExpenseCategory, number> = {
        repairs: 0,
        utilities: 0,
        taxes: 0,
        insurance: 0,
        management: 0,
        mortgage: 0,
        hoa: 0,
        landscaping: 0,
        cleaning: 0,
        legal: 0,
        advertising: 0,
        supplies: 0,
        other: 0,
      };

      let total = 0;

      data?.forEach((expense) => {
        const cat = expense.category as ExpenseCategory;
        byCategory[cat] = (byCategory[cat] || 0) + Number(expense.amount);
        total += Number(expense.amount);
      });

      return {
        byCategory,
        total,
        year: currentYear,
      };
    },
  });
}
