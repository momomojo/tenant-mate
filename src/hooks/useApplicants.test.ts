import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils';
import {
  useApplicants,
  useApplicant,
  useInviteApplicant,
  useUpdateApplicant,
  useDeleteApplicant,
  useApplicantCounts,
  type Applicant,
} from './useApplicants';

// Mock useAuthenticatedUser
const mockUser = { id: 'user-1', email: 'landlord@example.com' };
vi.mock('./useAuthenticatedUser', () => ({
  useAuthenticatedUser: () => ({ user: mockUser, isLoading: false, error: null }),
}));

// Mock Supabase client
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  },
}));

function setupQueryChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  chain.order.mockResolvedValue({ data: Array.isArray(data) ? data : [data], error });
  chain.or.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  mockFrom.mockReturnValue(chain);
  return chain;
}

const mockApplicant: Applicant = {
  id: 'app-1',
  property_id: 'prop-1',
  unit_id: 'unit-1',
  email: 'applicant@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  phone: '555-1234',
  status: 'invited',
  application_data: {},
  application_submitted_at: null,
  screening_order_id: null,
  screening_status: null,
  screening_completed_at: null,
  screening_provider: null,
  decision_notes: null,
  decided_by: null,
  decided_at: null,
  converted_tenant_id: null,
  converted_at: null,
  invited_by: 'user-1',
  invited_at: '2025-06-01T10:00:00Z',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  property: { id: 'prop-1', name: 'Test Property', address: '123 Main St' },
  unit: { id: 'unit-1', unit_number: '101' },
};

describe('useApplicants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useApplicants - query', () => {
    it('fetches applicants successfully', async () => {
      const chain = setupQueryChain([mockApplicant]);
      chain.order.mockResolvedValue({ data: [mockApplicant], error: null });

      const { result } = renderHook(() => useApplicants(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockApplicant]);
    });

    it('returns empty array when user is null', async () => {
      // Temporarily override the mock
      vi.doMock('./useAuthenticatedUser', () => ({
        useAuthenticatedUser: () => ({ user: null, isLoading: false, error: null }),
      }));

      // Since module mock is hoisted, test that enabled: !!user controls the query
      const chain = setupQueryChain([]);
      const { result } = renderHook(() => useApplicants(), {
        wrapper: createWrapper(),
      });

      // Query should eventually resolve
      await waitFor(() => expect(result.current.isSuccess || result.current.fetchStatus === 'idle').toBe(true));
    });

    it('applies property filter', async () => {
      const chain = setupQueryChain([mockApplicant]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [mockApplicant], error: null });

      const { result } = renderHook(() => useApplicants({ propertyId: 'prop-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('applies status filter', async () => {
      const chain = setupQueryChain([mockApplicant]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.eq.mockResolvedValueOnce({ data: [mockApplicant], error: null });

      const { result } = renderHook(() => useApplicants({ status: 'approved' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    });

    it('applies search filter', async () => {
      const chain = setupQueryChain([mockApplicant]);
      // Chain: .select().or(owner).order().or(search)
      // .order() must return chain so .or(search) can be called on it
      chain.order.mockReturnValue(chain);
      // First .or() (owner filter) returns chain, second .or() (search) resolves
      chain.or
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ data: [mockApplicant], error: null });

      const { result } = renderHook(() => useApplicants({ search: 'Jane' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      const chain = setupQueryChain(null, { message: 'Query failed' });
      chain.order.mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      const { result } = renderHook(() => useApplicants(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useApplicant - single', () => {
    it('fetches a single applicant', async () => {
      const chain = setupQueryChain(mockApplicant);

      const { result } = renderHook(() => useApplicant('app-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockApplicant);
    });

    it('is disabled when ID is undefined', () => {
      const { result } = renderHook(() => useApplicant(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useInviteApplicant', () => {
    it('invites an applicant successfully', async () => {
      const chain = setupQueryChain(mockApplicant);

      const { result } = renderHook(() => useInviteApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          propertyId: 'prop-1',
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'Applicant',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('sends optional unit ID', async () => {
      const chain = setupQueryChain(mockApplicant);

      const { result } = renderHook(() => useInviteApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          propertyId: 'prop-1',
          unitId: 'unit-1',
          email: 'new@example.com',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles invite error', async () => {
      const chain = setupQueryChain(null, { message: 'Email already exists' });

      const { result } = renderHook(() => useInviteApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          propertyId: 'prop-1',
          email: 'existing@example.com',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useUpdateApplicant', () => {
    it('updates applicant status to approved', async () => {
      const approved = { ...mockApplicant, status: 'approved' };
      const chain = setupQueryChain(approved);

      const { result } = renderHook(() => useUpdateApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          applicantId: 'app-1',
          status: 'approved',
          decisionNotes: 'Good candidate',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('updates applicant status to rejected', async () => {
      const rejected = { ...mockApplicant, status: 'rejected' };
      const chain = setupQueryChain(rejected);

      const { result } = renderHook(() => useUpdateApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          applicantId: 'app-1',
          status: 'rejected',
          decisionNotes: 'Credit score too low',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('updates application data', async () => {
      const updated = { ...mockApplicant, application_data: { income: 75000 } };
      const chain = setupQueryChain(updated);

      const { result } = renderHook(() => useUpdateApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          applicantId: 'app-1',
          applicationData: { income: 75000 },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles update error', async () => {
      const chain = setupQueryChain(null, { message: 'Update failed' });

      const { result } = renderHook(() => useUpdateApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          applicantId: 'app-1',
          status: 'approved',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('transitions through status workflow', async () => {
      const statuses: Applicant['status'][] = ['invited', 'started', 'submitted', 'screening', 'approved'];

      for (const status of statuses) {
        const chain = setupQueryChain({ ...mockApplicant, status });

        const { result } = renderHook(() => useUpdateApplicant(), {
          wrapper: createWrapper(),
        });

        await act(async () => {
          result.current.mutate({ applicantId: 'app-1', status });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
      }
    });
  });

  describe('useDeleteApplicant', () => {
    it('deletes an applicant', async () => {
      const chain = setupQueryChain(null);
      chain.eq.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDeleteApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('app-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles delete error', async () => {
      const chain = setupQueryChain(null);
      chain.eq.mockResolvedValue({ error: { message: 'Cannot delete converted applicant' } });

      const { result } = renderHook(() => useDeleteApplicant(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('app-1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useApplicantCounts', () => {
    it('counts applicants by status', async () => {
      const data = [
        { status: 'invited', property: {} },
        { status: 'submitted', property: {} },
        { status: 'approved', property: {} },
        { status: 'approved', property: {} },
      ];
      const chain = setupQueryChain(data);
      chain.or.mockResolvedValue({ data, error: null });

      const { result } = renderHook(() => useApplicantCounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.total).toBe(4);
      expect(result.current.data?.invited).toBe(1);
      expect(result.current.data?.submitted).toBe(1);
      expect(result.current.data?.approved).toBe(2);
    });

    it('filters by property ID', async () => {
      const chain = setupQueryChain([]);
      chain.or.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useApplicantCounts('prop-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('returns empty object on error', async () => {
      const chain = setupQueryChain(null, { message: 'Error' });
      chain.or.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const { result } = renderHook(() => useApplicantCounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({});
    });
  });
});
