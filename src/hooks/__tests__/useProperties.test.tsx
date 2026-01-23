import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock the Supabase client
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Mock useAuthenticatedUser
const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/hooks/useAuthenticatedUser', () => ({
  useAuthenticatedUser: () => ({ user: mockUser, isLoading: false, error: null }),
}));

import { useProperties, useProperty, useCreateProperty } from '../useProperties';

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

// Helper to create a chainable query mock that resolves with given result
function mockQueryChain(result: { data: any; error: any }) {
  const chain: any = {};
  const resolver = () => Promise.resolve(result);

  // Each method returns the chain, except terminal ones which resolve
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockImplementation(() => resolver());

  // Make the chain itself thenable for when it's the terminal call
  chain.then = (resolve: any, reject: any) => resolver().then(resolve, reject);

  return chain;
}

describe('useProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches properties successfully', async () => {
    const mockProperties = [
      { id: 'prop-1', name: 'Property 1', address: '123 Main St', created_by: 'user-123' },
      { id: 'prop-2', name: 'Property 2', address: '456 Oak Ave', created_by: 'user-123' },
    ];

    mockFrom.mockReturnValue(mockQueryChain({ data: mockProperties, error: null }));

    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProperties);
    expect(mockFrom).toHaveBeenCalledWith('properties');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: [], error: null }));

    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('handles fetch errors', async () => {
    const mockError = { message: 'Database error', code: 'PGRST301' };

    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: mockError }));

    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(mockError);
  });
});

describe('useProperty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single property by ID', async () => {
    const mockProperty = { id: 'prop-1', name: 'Test Property', address: '123 Main St' };

    mockFrom.mockReturnValue(mockQueryChain({ data: mockProperty, error: null }));

    const { result } = renderHook(() => useProperty('prop-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProperty);
  });

  it('does not fetch when propertyId is undefined', async () => {
    const { result } = renderHook(() => useProperty(undefined), { wrapper: createWrapper() });

    // Query should be disabled
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('handles single property fetch errors', async () => {
    const mockError = { message: 'Not found', code: 'PGRST116' };

    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: mockError }));

    const { result } = renderHook(() => useProperty('bad-id'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateProperty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a property successfully', async () => {
    const newProperty = {
      id: 'new-prop',
      name: 'New Property',
      address: '789 Elm St',
      created_by: 'user-123',
    };

    mockFrom.mockReturnValue(mockQueryChain({ data: newProperty, error: null }));

    const { result } = renderHook(() => useCreateProperty(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        name: 'New Property',
        address: '789 Elm St',
        city: 'Portland',
        state: 'OR',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newProperty);
  });

  it('handles creation errors', async () => {
    const mockError = { message: 'Duplicate name', code: '23505' };

    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: mockError }));

    const { result } = renderHook(() => useCreateProperty(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ name: 'Duplicate', address: '123 Main' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
