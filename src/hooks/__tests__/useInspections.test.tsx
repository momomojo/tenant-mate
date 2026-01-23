import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const mockFrom = vi.fn();
const mockAuthGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: { getUser: () => mockAuthGetUser() },
  },
}));

import {
  useInspections, useInspection, useCreateInspection,
  useUpdateInspection, useDeleteInspection, useCreateInspectionItem,
  useInspectionCounts, inspectionTypeConfig, inspectionStatusConfig,
  conditionConfig, defaultRooms, defaultItems,
} from '../useInspections';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
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
  chain.then = (resolve: any, reject: any) => resolver().then(resolve, reject);
  return chain;
}

describe('useInspections', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } }); });

  it('fetches inspections', async () => {
    const data = [{ id: 'insp-1', inspection_type: 'routine', status: 'scheduled' }];
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useInspections(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('handles errors', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: { message: 'Error' } }));
    const { result } = renderHook(() => useInspections(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useInspection', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches single inspection', async () => {
    const data = { id: 'insp-1', items: [], photos: [] };
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useInspection('insp-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('disabled when undefined', () => {
    const { result } = renderHook(() => useInspection(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateInspection', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } }); });

  it('creates inspection', async () => {
    const data = { id: 'new-insp', status: 'scheduled' };
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useCreateInspection(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate({ property_id: 'p1', unit_id: 'u1', inspection_type: 'routine' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useUpdateInspection', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates inspection', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: { id: 'insp-1', status: 'completed' }, error: null }));
    const { result } = renderHook(() => useUpdateInspection(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate({ id: 'insp-1', status: 'completed' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useDeleteInspection', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes inspection', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: null, error: null }));
    const { result } = renderHook(() => useDeleteInspection(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate('insp-1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useCreateInspectionItem', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates item', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: { id: 'item-1' }, error: null }));
    const { result } = renderHook(() => useCreateInspectionItem(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate({ inspection_id: 'insp-1', room: 'kitchen', item: 'walls' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useInspectionCounts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('counts by status', async () => {
    const data = [{ status: 'scheduled' }, { status: 'scheduled' }, { status: 'completed' }];
    mockFrom.mockReturnValue(mockQueryChain({ data, error: null }));
    const { result } = renderHook(() => useInspectionCounts(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(3);
    expect(result.current.data?.scheduled).toBe(2);
    expect(result.current.data?.completed).toBe(1);
  });
});

describe('Config constants', () => {
  it('inspectionTypeConfig has all types', () => {
    expect(inspectionTypeConfig.move_in.label).toBe('Move-In');
    expect(inspectionTypeConfig.routine.label).toBe('Routine');
  });

  it('inspectionStatusConfig has all statuses', () => {
    expect(inspectionStatusConfig.scheduled.label).toBe('Scheduled');
    expect(inspectionStatusConfig.completed.label).toBe('Completed');
  });

  it('conditionConfig has all ratings', () => {
    expect(conditionConfig.excellent.label).toBe('Excellent');
    expect(conditionConfig.damaged.label).toBe('Damaged');
  });

  it('defaultRooms and defaultItems exist', () => {
    expect(defaultRooms.length).toBeGreaterThan(0);
    expect(defaultItems.length).toBeGreaterThan(0);
    expect(defaultRooms).toContain('kitchen');
    expect(defaultItems).toContain('walls');
  });
});
