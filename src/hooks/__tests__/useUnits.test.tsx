import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock Supabase
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { useUnits, useUnit, useCreateUnit, useUpdateUnit } from '../useUnits';

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

describe('useUnits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches units for a property', async () => {
    const mockUnits = [
      { id: 'unit-1', unit_number: '101', status: 'available', property_id: 'prop-1' },
      { id: 'unit-2', unit_number: '102', status: 'occupied', property_id: 'prop-1' },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockUnits, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useUnits('prop-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUnits);
    expect(result.current.data).toHaveLength(2);
  });

  it('returns empty array when propertyId is undefined', async () => {
    const { result } = renderHook(() => useUnits(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('handles errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
        }),
      }),
    });

    const { result } = renderHook(() => useUnits('prop-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single unit', async () => {
    const mockUnit = { id: 'unit-1', unit_number: '101', status: 'available' };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUnit, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useUnit('unit-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUnit);
  });

  it('is disabled when unitId is undefined', () => {
    const { result } = renderHook(() => useUnit(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a unit successfully', async () => {
    const newUnit = {
      id: 'new-unit',
      unit_number: '201',
      status: 'available',
      property_id: 'prop-1',
      bedrooms: 2,
      bathrooms: 1,
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newUnit, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useCreateUnit(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        propertyId: 'prop-1',
        unitNumber: '201',
        bedrooms: 2,
        bathrooms: 1,
        squareFeet: 850,
        rentAmount: 1500,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newUnit);
  });

  it('handles creation errors (duplicate unit number)', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate' } }),
        }),
      }),
    });

    const { result } = renderHook(() => useCreateUnit(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-1', unitNumber: '101' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates unit details', async () => {
    const updatedUnit = {
      id: 'unit-1',
      unit_number: '101',
      status: 'occupied',
      rent_amount: 1600,
    };

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedUnit, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useUpdateUnit(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        unitId: 'unit-1',
        propertyId: 'prop-1',
        status: 'occupied',
        rentAmount: 1600,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(updatedUnit);
  });

  it('updates only specified fields', async () => {
    const updatedUnit = { id: 'unit-1', bedrooms: 3 };

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedUnit, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useUpdateUnit(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        unitId: 'unit-1',
        propertyId: 'prop-1',
        bedrooms: 3,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('handles update errors', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed' } }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useUpdateUnit(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ unitId: 'unit-1', propertyId: 'prop-1', status: 'maintenance' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
