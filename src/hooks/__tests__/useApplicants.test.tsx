import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (...args: any[]) => mockFrom(...args) } }));

const mockUser = { id: 'user-123', email: 'landlord@example.com' };
vi.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ user: mockUser, isLoading: false, error: null }) }));

import { useApplicants, useApplicant, useInviteApplicant, useUpdateApplicant, useDeleteApplicant, useApplicantCounts } from '../useApplicants';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (<QueryClientProvider client={qc}>{children}</QueryClientProvider>);
}

function mockQueryChain(result: { data: any; error: any }) {
  const chain: any = {};
  const resolver = () => Promise.resolve(result);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockImplementation(() => resolver());
  chain.maybeSingle = vi.fn().mockImplementation(() => resolver());
  chain.then = (resolve: any, reject: any) => resolver().then(resolve, reject);
  return chain;
}

describe('useApplicants', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches applicants', async () => {
    const data = [{ id: 'app-1', email: 'john@test.com', status: 'invited' }];
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useApplicants(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('handles errors', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: { message: 'Error' } }));
    const { result } = renderHook(() => useApplicants(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useApplicant', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches single applicant', async () => {
    const data = { id: 'app-1', email: 'john@test.com' };
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useApplicant('app-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('disabled when undefined', () => {
    const { result } = renderHook(() => useApplicant(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useInviteApplicant', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('invites applicant', async () => {
    const data = { id: 'new-app', email: 'new@test.com', status: 'invited' };
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useInviteApplicant(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate({ propertyId: 'prop-1', email: 'new@test.com' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('handles errors', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: { message: 'Duplicate' } }));
    const { result } = renderHook(() => useInviteApplicant(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate({ propertyId: 'prop-1', email: 'dup@test.com' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateApplicant', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates to approved', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: { id: 'app-1', status: 'approved' }, error: null }));
    const { result } = renderHook(() => useUpdateApplicant(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate({ applicantId: 'app-1', status: 'approved' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('updates to rejected', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: { id: 'app-1', status: 'rejected' }, error: null }));
    const { result } = renderHook(() => useUpdateApplicant(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate({ applicantId: 'app-1', status: 'rejected', decisionNotes: 'No' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useDeleteApplicant', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes applicant', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: null }));
    const { result } = renderHook(() => useDeleteApplicant(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate('app-1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useApplicantCounts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('counts by status', async () => {
    const data = [{ status: 'invited' }, { status: 'invited' }, { status: 'approved' }, { status: 'converted' }];
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useApplicantCounts(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(4);
    expect(result.current.data?.invited).toBe(2);
    expect(result.current.data?.approved).toBe(1);
  });

  it('returns empty on error', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: { message: 'Error' } }));
    const { result } = renderHook(() => useApplicantCounts(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({});
  });
});
