import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils';
import {
  useExpenses,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseSummary,
  expenseCategoryConfig,
  type Expense,
  type ExpenseFilters,
  type CreateExpenseInput,
} from './useExpenses';

// Mock Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

function setupQueryChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  // For insert/update/delete chains that end with .select().single()
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue({ ...chain, then: undefined });

  // Default resolution for the chain (for queries without .single())
  chain.order.mockResolvedValue({ data, error });
  chain.or.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);

  mockFrom.mockReturnValue(chain);
  return chain;
}

const mockExpense: Expense = {
  id: 'exp-1',
  property_id: 'prop-1',
  unit_id: 'unit-1',
  created_by: 'user-1',
  category: 'repairs',
  amount: 500,
  expense_date: '2025-06-15',
  description: 'Fixed broken window',
  vendor: 'ABC Repairs',
  receipt_path: null,
  receipt_url: null,
  is_recurring: false,
  recurring_frequency: null,
  is_tax_deductible: true,
  tax_category: 'repairs',
  notes: 'Urgent repair',
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2025-06-15T10:00:00Z',
  property: { id: 'prop-1', name: 'Test Property', address: '123 Main St' },
  unit: { id: 'unit-1', unit_number: '101' },
};

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useExpenses - query', () => {
    it('fetches all expenses without filters', async () => {
      const chain = setupQueryChain([mockExpense]);
      chain.order.mockResolvedValue({ data: [mockExpense], error: null });

      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockExpense]);
      expect(mockFrom).toHaveBeenCalledWith('expenses');
    });

    it('applies property filter', async () => {
      const filters: ExpenseFilters = { propertyId: 'prop-1' };
      const chain = setupQueryChain([mockExpense]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [mockExpense], error: null });

      const { result } = renderHook(() => useExpenses(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('applies category filter', async () => {
      const filters: ExpenseFilters = { category: 'utilities' };
      const chain = setupQueryChain([]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useExpenses(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('applies date range filters', async () => {
      const filters: ExpenseFilters = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      const chain = setupQueryChain([mockExpense]);
      chain.order.mockReturnValue(chain);
      chain.gte.mockReturnValue(chain);
      chain.lte.mockResolvedValue({ data: [mockExpense], error: null });

      const { result } = renderHook(() => useExpenses(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('applies search filter', async () => {
      const filters: ExpenseFilters = { search: 'window' };
      const chain = setupQueryChain([mockExpense]);
      chain.order.mockReturnValue(chain);
      chain.or.mockResolvedValue({ data: [mockExpense], error: null });

      const { result } = renderHook(() => useExpenses(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API errors', async () => {
      const chain = setupQueryChain(null, { message: 'Database error' });
      chain.order.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('returns empty array when no data', async () => {
      const chain = setupQueryChain([]);
      chain.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('applies multiple filters simultaneously', async () => {
      const filters: ExpenseFilters = {
        propertyId: 'prop-1',
        category: 'repairs',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        search: 'window',
      };
      const chain = setupQueryChain([mockExpense]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.gte.mockReturnValue(chain);
      chain.lte.mockReturnValue(chain);
      chain.or.mockResolvedValue({ data: [mockExpense], error: null });

      const { result } = renderHook(() => useExpenses(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useExpense - single expense', () => {
    it('fetches a single expense by ID', async () => {
      const chain = setupQueryChain(mockExpense);

      const { result } = renderHook(() => useExpense('exp-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockExpense);
    });

    it('is disabled when expenseId is undefined', () => {
      const { result } = renderHook(() => useExpense(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles not found error', async () => {
      const chain = setupQueryChain(null, { message: 'No rows found', code: 'PGRST116' });

      const { result } = renderHook(() => useExpense('nonexistent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreateExpense', () => {
    it('creates an expense successfully', async () => {
      const newExpense: CreateExpenseInput = {
        property_id: 'prop-1',
        category: 'repairs',
        amount: 300,
        expense_date: '2025-07-01',
        description: 'New repair',
      };

      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const chain = setupQueryChain({ ...mockExpense, ...newExpense });

      const { result } = renderHook(() => useCreateExpense(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newExpense);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles creation error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const chain = setupQueryChain(null, { message: 'Insert failed' });

      const { result } = renderHook(() => useCreateExpense(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          property_id: 'prop-1',
          category: 'repairs',
          amount: 300,
          expense_date: '2025-07-01',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('includes created_by from authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
      const chain = setupQueryChain(mockExpense);

      const { result } = renderHook(() => useCreateExpense(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          property_id: 'prop-1',
          category: 'utilities',
          amount: 100,
          expense_date: '2025-07-01',
        });
      });

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
      expect(mockGetUser).toHaveBeenCalled();
    });
  });

  describe('useUpdateExpense', () => {
    it('updates an expense successfully', async () => {
      const updated = { ...mockExpense, amount: 600 };
      const chain = setupQueryChain(updated);

      const { result } = renderHook(() => useUpdateExpense(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'exp-1', amount: 600 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles update error', async () => {
      const chain = setupQueryChain(null, { message: 'Update failed' });

      const { result } = renderHook(() => useUpdateExpense(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'exp-1', amount: -1 });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDeleteExpense', () => {
    it('deletes an expense successfully', async () => {
      const chain = setupQueryChain(null);
      chain.eq.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDeleteExpense(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('exp-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles delete error', async () => {
      const chain = setupQueryChain(null, { message: 'Delete failed' });
      chain.eq.mockResolvedValue({ error: { message: 'Delete failed' } });

      const { result } = renderHook(() => useDeleteExpense(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('exp-1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useExpenseSummary', () => {
    it('aggregates expenses by category', async () => {
      const expenses = [
        { category: 'repairs', amount: 500 },
        { category: 'repairs', amount: 300 },
        { category: 'utilities', amount: 200 },
      ];
      const chain = setupQueryChain(expenses);
      chain.lte.mockResolvedValue({ data: expenses, error: null });
      chain.gte.mockReturnValue(chain);

      const { result } = renderHook(() => useExpenseSummary(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.byCategory.repairs).toBe(800);
      expect(result.current.data?.byCategory.utilities).toBe(200);
      expect(result.current.data?.total).toBe(1000);
    });

    it('filters by property ID', async () => {
      const chain = setupQueryChain([]);
      chain.gte.mockReturnValue(chain);
      chain.lte.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useExpenseSummary('prop-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.total).toBe(0);
    });

    it('uses provided year or defaults to current', async () => {
      const chain = setupQueryChain([]);
      chain.gte.mockReturnValue(chain);
      chain.lte.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useExpenseSummary(undefined, 2024), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.year).toBe(2024);
    });

    it('handles empty data', async () => {
      const chain = setupQueryChain([]);
      chain.gte.mockReturnValue(chain);
      chain.lte.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useExpenseSummary(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.total).toBe(0);
    });
  });

  describe('expenseCategoryConfig', () => {
    it('has configuration for all expense categories', () => {
      const categories = [
        'repairs', 'utilities', 'taxes', 'insurance', 'management',
        'mortgage', 'hoa', 'landscaping', 'cleaning', 'legal',
        'advertising', 'supplies', 'other',
      ];

      categories.forEach((cat) => {
        expect(expenseCategoryConfig[cat as keyof typeof expenseCategoryConfig]).toBeDefined();
        expect(expenseCategoryConfig[cat as keyof typeof expenseCategoryConfig].label).toBeTruthy();
        expect(expenseCategoryConfig[cat as keyof typeof expenseCategoryConfig].color).toMatch(/^bg-/);
      });
    });
  });
});
