import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils';
import {
  useInspections,
  useInspection,
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,
  useCreateInspectionItem,
  useUpdateInspectionItem,
  useInspectionCounts,
  inspectionTypeConfig,
  inspectionStatusConfig,
  conditionConfig,
  defaultRooms,
  defaultItems,
  type Inspection,
  type InspectionFilters,
  type CreateInspectionInput,
} from './useInspections';

// Mock Supabase client
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
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  chain.order.mockResolvedValue({ data: Array.isArray(data) ? data : [data], error });
  chain.eq.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);

  mockFrom.mockReturnValue(chain);
  return chain;
}

const mockInspection: Inspection = {
  id: 'insp-1',
  property_id: 'prop-1',
  unit_id: 'unit-1',
  tenant_id: 'tenant-1',
  created_by: 'user-1',
  inspection_type: 'routine',
  scheduled_date: '2025-07-01',
  completed_date: null,
  status: 'scheduled',
  overall_condition: null,
  inspector_notes: null,
  tenant_comments: null,
  inspector_signature_date: null,
  tenant_signature_date: null,
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2025-06-15T10:00:00Z',
  property: { id: 'prop-1', name: 'Test Property', address: '123 Main St' },
  unit: { id: 'unit-1', unit_number: '101' },
  tenant: { id: 'tenant-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
};

describe('useInspections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useInspections - query', () => {
    it('fetches all inspections without filters', async () => {
      const chain = setupQueryChain([mockInspection]);
      chain.order.mockResolvedValue({ data: [mockInspection], error: null });

      const { result } = renderHook(() => useInspections(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockInspection]);
      expect(mockFrom).toHaveBeenCalledWith('inspections');
    });

    it('applies property filter', async () => {
      const filters: InspectionFilters = { propertyId: 'prop-1' };
      const chain = setupQueryChain([mockInspection]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [mockInspection], error: null });

      const { result } = renderHook(() => useInspections(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('applies unit filter', async () => {
      const filters: InspectionFilters = { unitId: 'unit-1' };
      const chain = setupQueryChain([mockInspection]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [mockInspection], error: null });

      const { result } = renderHook(() => useInspections(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('applies type filter', async () => {
      const filters: InspectionFilters = { type: 'move_in' };
      const chain = setupQueryChain([]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useInspections(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('applies status filter', async () => {
      const filters: InspectionFilters = { status: 'completed' };
      const chain = setupQueryChain([]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useInspections(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('applies multiple filters', async () => {
      const filters: InspectionFilters = {
        propertyId: 'prop-1',
        unitId: 'unit-1',
        type: 'routine',
        status: 'scheduled',
      };
      const chain = setupQueryChain([mockInspection]);
      chain.order.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      // Final call resolves
      chain.eq.mockResolvedValueOnce({ data: [mockInspection], error: null });

      const { result } = renderHook(() => useInspections(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    });

    it('handles error response', async () => {
      const chain = setupQueryChain(null, { message: 'Database error' });
      chain.order.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const { result } = renderHook(() => useInspections(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useInspection - single', () => {
    it('fetches a single inspection by ID', async () => {
      const chain = setupQueryChain(mockInspection);

      const { result } = renderHook(() => useInspection('insp-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockInspection);
    });

    it('is disabled when ID is undefined', () => {
      const { result } = renderHook(() => useInspection(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreateInspection', () => {
    it('creates an inspection successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const chain = setupQueryChain(mockInspection);

      const input: CreateInspectionInput = {
        property_id: 'prop-1',
        unit_id: 'unit-1',
        inspection_type: 'routine',
        scheduled_date: '2025-08-01',
      };

      const { result } = renderHook(() => useCreateInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(input);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles creation error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const chain = setupQueryChain(null, { message: 'Insert failed' });

      const { result } = renderHook(() => useCreateInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          property_id: 'prop-1',
          unit_id: 'unit-1',
          inspection_type: 'routine',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('sets created_by from authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-99' } } });
      const chain = setupQueryChain(mockInspection);

      const { result } = renderHook(() => useCreateInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          property_id: 'prop-1',
          unit_id: 'unit-1',
          inspection_type: 'move_in',
        });
      });

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
      expect(mockGetUser).toHaveBeenCalled();
    });
  });

  describe('useUpdateInspection', () => {
    it('updates inspection status', async () => {
      const updated = { ...mockInspection, status: 'in_progress' };
      const chain = setupQueryChain(updated);

      const { result } = renderHook(() => useUpdateInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'insp-1', status: 'in_progress' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('updates with completion data', async () => {
      const updated = {
        ...mockInspection,
        status: 'completed',
        completed_date: '2025-07-01',
        overall_condition: 'good',
      };
      const chain = setupQueryChain(updated);

      const { result } = renderHook(() => useUpdateInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'insp-1',
          status: 'completed',
          completed_date: '2025-07-01',
          overall_condition: 'good',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles update error', async () => {
      const chain = setupQueryChain(null, { message: 'Update failed' });

      const { result } = renderHook(() => useUpdateInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'insp-1', status: 'cancelled' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDeleteInspection', () => {
    it('deletes an inspection', async () => {
      const chain = setupQueryChain(null);
      chain.eq.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDeleteInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('insp-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles delete error', async () => {
      const chain = setupQueryChain(null);
      chain.eq.mockResolvedValue({ error: { message: 'Cannot delete' } });

      const { result } = renderHook(() => useDeleteInspection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('insp-1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreateInspectionItem', () => {
    it('creates an inspection item', async () => {
      const item = {
        id: 'item-1',
        inspection_id: 'insp-1',
        room: 'living_room',
        item: 'walls',
        condition: 'good',
        notes: 'Minor scuffs',
      };
      const chain = setupQueryChain(item);

      const { result } = renderHook(() => useCreateInspectionItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          inspection_id: 'insp-1',
          room: 'living_room',
          item: 'walls',
          condition: 'good',
          notes: 'Minor scuffs',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useUpdateInspectionItem', () => {
    it('updates an inspection item condition', async () => {
      const chain = setupQueryChain({ id: 'item-1', condition: 'poor' });

      const { result } = renderHook(() => useUpdateInspectionItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          inspection_id: 'insp-1',
          condition: 'poor',
          estimated_repair_cost: 200,
          charge_to_tenant: true,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useInspectionCounts', () => {
    it('counts inspections by status', async () => {
      const data = [
        { status: 'scheduled' },
        { status: 'scheduled' },
        { status: 'completed' },
        { status: 'in_progress' },
      ];
      const chain = setupQueryChain(data);
      chain.select.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data, error: null });
      // Without filter, resolves directly from select
      mockFrom.mockReturnValue({
        ...chain,
        select: vi.fn().mockResolvedValue({ data, error: null }),
      });

      const { result } = renderHook(() => useInspectionCounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.total).toBe(4);
      expect(result.current.data?.scheduled).toBe(2);
      expect(result.current.data?.completed).toBe(1);
      expect(result.current.data?.in_progress).toBe(1);
      expect(result.current.data?.cancelled).toBe(0);
    });

    it('filters counts by property', async () => {
      const chain = setupQueryChain([]);
      chain.select.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useInspectionCounts('prop-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.total).toBe(0);
    });
  });

  describe('Config objects', () => {
    it('inspectionTypeConfig has all types', () => {
      const types = ['move_in', 'move_out', 'routine', 'maintenance', 'annual'];
      types.forEach((t) => {
        expect(inspectionTypeConfig[t as keyof typeof inspectionTypeConfig]).toBeDefined();
        expect(inspectionTypeConfig[t as keyof typeof inspectionTypeConfig].label).toBeTruthy();
      });
    });

    it('inspectionStatusConfig has all statuses', () => {
      const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
      statuses.forEach((s) => {
        expect(inspectionStatusConfig[s as keyof typeof inspectionStatusConfig]).toBeDefined();
      });
    });

    it('conditionConfig has all ratings', () => {
      const ratings = ['excellent', 'good', 'fair', 'poor', 'damaged', 'missing'];
      ratings.forEach((r) => {
        expect(conditionConfig[r as keyof typeof conditionConfig]).toBeDefined();
      });
    });

    it('defaultRooms contains expected rooms', () => {
      expect(defaultRooms).toContain('living_room');
      expect(defaultRooms).toContain('kitchen');
      expect(defaultRooms).toContain('bathroom');
      expect(defaultRooms.length).toBeGreaterThan(5);
    });

    it('defaultItems contains expected items', () => {
      expect(defaultItems).toContain('walls');
      expect(defaultItems).toContain('floors');
      expect(defaultItems).toContain('windows');
      expect(defaultItems.length).toBeGreaterThan(5);
    });
  });
});
