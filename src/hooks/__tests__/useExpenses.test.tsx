import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock Supabase
const mockFrom = vi.fn();
const mockAuthGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: () => mockAuthGetUser(),
    },
  },
}));

import {
  useExpenses,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseSummary,
  expenseCategoryConfig,
} from '../useExpenses';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Helper to create chainable mock
function mockQueryChain(result: { data: any; error: any }) {
  const chain: any = {};
  const resolver = () => Promise.resolve(result);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockImplementation(() => resolver());
  chain.then = (resolve: any, reject: any) => resolver().then(resolve, reject);
  return chain;
}

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
  });

  it('fetches expenses without filters', async () => {
    const mockExpenses = [
      { id: 'exp-1', category: 'repairs', amount: 150, expense_date: '2025-01-15' },
      { id: 'exp-2', category: 'utilities', amount: 200, expense_date: '2025-01-10' },
    ];

    mockFrom.mockReturnValue(mockQueryChain({ data: mockExpenses, error: null }));

    const { result } = renderHook(() => useExpenses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockExpenses);
    expect(mockFrom).toHaveBeenCalledWith('expenses');
  });

  it('handles fetch errors', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: { message: 'Permission denied' } }));

    const { result } = renderHook(() => useExpenses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('fetches with category filter', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: [{ id: 'exp-1', category: 'repairs' }], error: null }));

    const { result } = renderHook(
      () => useExpenses({ category: 'repairs' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single expense by ID', async () => {
    const mockExpense = { id: 'exp-1', category: 'repairs', amount: 150 };

    mockFrom.mockReturnValue(mockQueryChain({ data: mockExpense, error: null }));

    const { result } = renderHook(() => useExpense('exp-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockExpense);
  });

  it('is disabled when expenseId is undefined', async () => {
    const { result } = renderHook(() => useExpense(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
  });

  it('creates an expense successfully', async () => {
    const newExpense = { id: 'new-exp', category: 'repairs', amount: 250 };

    mockFrom.mockReturnValue(mockQueryChain({ data: newExpense, error: null }));

    const { result } = renderHook(() => useCreateExpense(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        property_id: 'prop-1',
        category: 'repairs',
        amount: 250,
        expense_date: '2025-01-15',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newExpense);
  });

  it('handles creation errors', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: { message: 'Insert failed' } }));

    const { result } = renderHook(() => useCreateExpense(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        property_id: 'prop-1',
        category: 'repairs',
        amount: 250,
        expense_date: '2025-01-15',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates an expense successfully', async () => {
    const updatedExpense = { id: 'exp-1', category: 'utilities', amount: 300 };

    mockFrom.mockReturnValue(mockQueryChain({ data: updatedExpense, error: null }));

    const { result } = renderHook(() => useUpdateExpense(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'exp-1', category: 'utilities', amount: 300 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(updatedExpense);
  });
});

describe('useDeleteExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes an expense successfully', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: null }));

    const { result } = renderHook(() => useDeleteExpense(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('exp-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('handles delete errors', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: { message: 'Cannot delete' } }));

    const { result } = renderHook(() => useDeleteExpense(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('exp-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useExpenseSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates expense summary by category', async () => {
    const mockData = [
      { category: 'repairs', amount: 100 },
      { category: 'repairs', amount: 200 },
      { category: 'utilities', amount: 150 },
    ];

    mockFrom.mockReturnValue(mockQueryChain({ data: mockData, error: null }));

    const { result } = renderHook(() => useExpenseSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.byCategory.repairs).toBe(300);
    expect(result.current.data?.byCategory.utilities).toBe(150);
    expect(result.current.data?.total).toBe(450);
  });
});

describe('expenseCategoryConfig', () => {
  it('contains all expected categories', () => {
    const expectedCategories = [
      'repairs', 'utilities', 'taxes', 'insurance', 'management',
      'mortgage', 'hoa', 'landscaping', 'cleaning', 'legal',
      'advertising', 'supplies', 'other',
    ];

    expectedCategories.forEach((cat) => {
      expect(expenseCategoryConfig[cat as keyof typeof expenseCategoryConfig]).toBeDefined();
      expect(expenseCategoryConfig[cat as keyof typeof expenseCategoryConfig].label).toBeTruthy();
      expect(expenseCategoryConfig[cat as keyof typeof expenseCategoryConfig].color).toBeTruthy();
    });
  });
});
