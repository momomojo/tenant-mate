import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock Supabase - use vi.hoisted to ensure these are available when vi.mock factory runs
const { mockFrom, mockChannel, mockRemoveChannel, mockRpc, mockStorage } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
  mockRpc: vi.fn(),
  mockStorage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } }),
    }),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    storage: mockStorage,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

// Mock useAuthenticatedUser
vi.mock('@/hooks/useAuthenticatedUser', () => ({
  useAuthenticatedUser: () => ({ user: { id: 'user-123', email: 'test@example.com' }, isLoading: false, error: null }),
}));

import { useMessages, useSendMessage, useMarkMessagesRead, useUploadMessageAttachment } from '../useMessages';

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

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup channel mock
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
  });

  it('fetches messages for a conversation', async () => {
    const mockMessages = [
      { id: 'msg-1', content: 'Hello', sender_id: 'user-123', created_at: '2025-01-15T10:00:00' },
      { id: 'msg-2', content: 'Hi!', sender_id: 'user-456', created_at: '2025-01-15T10:01:00' },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useMessages('conv-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMessages);
  });

  it('returns empty when conversationId is undefined', async () => {
    const { result } = renderHook(
      () => useMessages(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('handles fetch errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useMessages('conv-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('sets up realtime subscription', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    renderHook(
      () => useMessages('conv-1'),
      { wrapper: createWrapper() }
    );

    expect(mockChannel).toHaveBeenCalledWith('messages:conv-1');
  });
});

describe('useSendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a text message', async () => {
    const newMessage = {
      id: 'msg-new',
      conversation_id: 'conv-1',
      content: 'Test message',
      sender_id: 'user-123',
      message_type: 'text',
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newMessage, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        conversationId: 'conv-1',
        content: 'Test message',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newMessage);
  });

  it('sends a message with attachment', async () => {
    const newMessage = {
      id: 'msg-new',
      conversation_id: 'conv-1',
      content: 'Check this file',
      message_type: 'file',
      attachment_url: 'https://example.com/file.pdf',
      attachment_name: 'document.pdf',
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newMessage, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        conversationId: 'conv-1',
        content: 'Check this file',
        messageType: 'file',
        attachmentUrl: 'https://example.com/file.pdf',
        attachmentName: 'document.pdf',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('handles send errors', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed' } }),
        }),
      }),
    });

    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ conversationId: 'conv-1', content: 'Test' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useMarkMessagesRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks messages as read via RPC', async () => {
    mockRpc.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useMarkMessagesRead(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('conv-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledWith('mark_messages_read', {
      p_conversation_id: 'conv-1',
      p_user_id: 'user-123',
    });
  });

  it('handles RPC errors', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'RPC failed' } });

    const { result } = renderHook(() => useMarkMessagesRead(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('conv-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUploadMessageAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/file.pdf' } }),
    });
  });

  it('uploads a file successfully', async () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    const { result } = renderHook(() => useUploadMessageAttachment(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(file);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.url).toBe('https://cdn.example.com/file.pdf');
    expect(result.current.data?.name).toBe('test.pdf');
  });

  it('handles upload errors', async () => {
    mockStorage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: 'Upload failed' } }),
      getPublicUrl: vi.fn(),
    });

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    const { result } = renderHook(() => useUploadMessageAttachment(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(file);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
