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
const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/hooks/useAuthenticatedUser', () => ({
  useAuthenticatedUser: () => ({ user: mockUser, isLoading: false, error: null }),
}));

import {
  useConversations,
  useConversation,
  useCreateConversation,
  useArchiveConversation,
  useUnreadCount,
} from '../useConversations';

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

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches conversations and maps other_user correctly for landlord', async () => {
    const mockConversations = [
      {
        id: 'conv-1',
        landlord_id: 'user-123',
        tenant_id: 'tenant-1',
        subject: 'Maintenance',
        is_archived: false,
        landlord: { id: 'user-123', first_name: 'Owner', last_name: 'Smith' },
        tenant: { id: 'tenant-1', first_name: 'Tenant', last_name: 'Jones' },
      },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockConversations, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useConversations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // When user is landlord, other_user should be tenant
    expect(result.current.data?.[0].other_user?.first_name).toBe('Tenant');
  });

  it('handles fetch errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useConversations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single conversation', async () => {
    const mockConversation = {
      id: 'conv-1',
      landlord_id: 'user-123',
      tenant_id: 'tenant-1',
      tenant: { id: 'tenant-1', first_name: 'John' },
      landlord: { id: 'user-123', first_name: 'Owner' },
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useConversation('conv-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.other_user?.first_name).toBe('John');
  });

  it('is disabled when conversationId is undefined', () => {
    const { result } = renderHook(() => useConversation(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new conversation when none exists', async () => {
    const newConv = {
      id: 'new-conv',
      landlord_id: 'user-123',
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
    };

    // First call: maybeSingle returns null (no existing)
    // Second call: insert
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Check for existing conversation
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          }),
        };
      }
      // Create new conversation
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newConv, error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useCreateConversation(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        subject: 'New topic',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('returns existing conversation if found', async () => {
    const existingConv = {
      id: 'existing-conv',
      landlord_id: 'user-123',
      tenant_id: 'tenant-1',
      is_archived: false,
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: existingConv }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useCreateConversation(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('existing-conv');
  });
});

describe('useArchiveConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('archives a conversation', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { result } = renderHook(() => useArchiveConversation(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('conv-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates unread count for landlord', async () => {
    // First call: get profile
    // Second call: get conversations
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { role: 'property_manager' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { landlord_unread_count: 3 },
                { landlord_unread_count: 2 },
                { landlord_unread_count: 0 },
              ],
              error: null,
            }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useUnreadCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(5);
  });

  it('returns 0 when no unread messages', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { role: 'tenant' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ tenant_unread_count: 0 }],
              error: null,
            }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useUnreadCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });
});
