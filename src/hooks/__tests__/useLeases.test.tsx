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

// Mock useAuthenticatedUser
const mockUser = { id: 'user-123', email: 'landlord@example.com' };
vi.mock('@/hooks/useAuthenticatedUser', () => ({
  useAuthenticatedUser: () => ({ user: mockUser, isLoading: false, error: null }),
}));

import {
  useLeases,
  useLease,
  useLeaseTemplates,
  useCreateLease,
  useUpdateLease,
  useDeleteLease,
  useLeaseCounts,
} from '../useLeases';

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

describe('useLeases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches leases successfully', async () => {
    const mockLeases = [
      { id: 'lease-1', status: 'active', monthly_rent: 1500 },
      { id: 'lease-2', status: 'draft', monthly_rent: 1200 },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockLeases, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useLeases(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockLeases);
  });

  it('applies property filter', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      }),
    });

    const { result } = renderHook(
      () => useLeases({ propertyId: 'prop-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('applies tenant filter', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      }),
    });

    const { result } = renderHook(
      () => useLeases({ tenantId: 'tenant-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('handles fetch errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Forbidden' } }),
        }),
      }),
    });

    const { result } = renderHook(() => useLeases(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useLease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single lease', async () => {
    const mockLease = {
      id: 'lease-1',
      status: 'active',
      monthly_rent: 1500,
      lease_start: '2025-01-01',
      lease_end: '2026-01-01',
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockLease, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useLease('lease-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockLease);
  });

  it('is disabled when leaseId is undefined', () => {
    const { result } = renderHook(() => useLease(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useLeaseTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches active lease templates', async () => {
    const mockTemplates = [
      { id: 'tpl-1', name: 'Standard', is_active: true, is_default: true },
      { id: 'tpl-2', name: 'Custom', is_active: true, is_default: false },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useLeaseTemplates(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTemplates);
  });
});

describe('useCreateLease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a lease successfully', async () => {
    const newLease = {
      id: 'new-lease',
      status: 'draft',
      monthly_rent: 1800,
      property_id: 'prop-1',
      unit_id: 'unit-1',
      tenant_id: 'tenant-1',
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newLease, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useCreateLease(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        propertyId: 'prop-1',
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        leaseStart: '2025-02-01',
        leaseEnd: '2026-02-01',
        monthlyRent: 1800,
        securityDeposit: 1800,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newLease);
  });

  it('handles creation errors', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Conflict' } }),
        }),
      }),
    });

    const { result } = renderHook(() => useCreateLease(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        propertyId: 'prop-1',
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        leaseStart: '2025-02-01',
        leaseEnd: '2026-02-01',
        monthlyRent: 1800,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateLease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates lease status', async () => {
    const updated = { id: 'lease-1', status: 'active' };

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useUpdateLease(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ leaseId: 'lease-1', status: 'active' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('updates signature status', async () => {
    const updated = { id: 'lease-1', signature_status: 'completed' };

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useUpdateLease(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ leaseId: 'lease-1', signatureStatus: 'completed' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useDeleteLease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a lease', async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { result } = renderHook(() => useDeleteLease(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('lease-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useLeaseCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates lease counts by status', async () => {
    const mockData = [
      { status: 'active', property: {} },
      { status: 'active', property: {} },
      { status: 'draft', property: {} },
      { status: 'expired', property: {} },
      { status: 'pending', property: {} },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    });

    const { result } = renderHook(() => useLeaseCounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(5);
    expect(result.current.data?.active).toBe(2);
    expect(result.current.data?.draft).toBe(1);
    expect(result.current.data?.expired).toBe(1);
    expect(result.current.data?.pending).toBe(1);
  });
});
