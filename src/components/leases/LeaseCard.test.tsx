import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { LeaseCard } from './LeaseCard';
import type { Lease } from '@/hooks/useLeases';

describe('LeaseCard', () => {
  const defaultHandlers = {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onSendForSignature: vi.fn(),
    onActivate: vi.fn(),
    onTerminate: vi.fn(),
    onRenew: vi.fn(),
    onDelete: vi.fn(),
  };

  const baseLease: Lease = {
    id: 'lease-1',
    property_id: 'prop-1',
    unit_id: 'unit-1',
    tenant_id: 'tenant-1',
    template_id: null,
    status: 'active',
    lease_start: '2025-01-15',
    lease_end: '2026-01-15',
    monthly_rent: 1500,
    security_deposit: 1500,
    late_fee: 50,
    grace_period_days: 5,
    pet_deposit: 0,
    pet_rent: 0,
    content: null,
    signature_provider: null,
    signature_request_id: null,
    signature_status: 'not_sent',
    landlord_signed_at: null,
    tenant_signed_at: null,
    signed_document_url: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    property: { id: 'prop-1', name: 'Sunset Apartments', address: '123 Main St' },
    unit: { id: 'unit-1', unit_number: '201' },
    tenant: { id: 'tenant-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
  };

  it('renders property name and unit', () => {
    render(<LeaseCard lease={baseLease} {...defaultHandlers} />);

    expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
    expect(screen.getByText('Unit 201')).toBeInTheDocument();
  });

  it('renders tenant name', () => {
    render(<LeaseCard lease={baseLease} {...defaultHandlers} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders tenant email when no name available', () => {
    const noNameLease = {
      ...baseLease,
      tenant: { id: 'tenant-1', first_name: null, last_name: null, email: 'john@test.com' },
    };

    render(<LeaseCard lease={noNameLease} {...defaultHandlers} />);

    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });

  it('renders monthly rent', () => {
    render(<LeaseCard lease={baseLease} {...defaultHandlers} />);

    expect(screen.getByText('$1,500/month')).toBeInTheDocument();
  });

  it('renders lease dates', () => {
    render(<LeaseCard lease={baseLease} {...defaultHandlers} />);

    expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
  });

  it('renders Active status badge', () => {
    render(<LeaseCard lease={baseLease} {...defaultHandlers} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders Draft status badge', () => {
    const draftLease = { ...baseLease, status: 'draft' as const };
    render(<LeaseCard lease={draftLease} {...defaultHandlers} />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders Pending Signature status badge', () => {
    const pendingLease = { ...baseLease, status: 'pending' as const };
    render(<LeaseCard lease={pendingLease} {...defaultHandlers} />);

    expect(screen.getByText('Pending Signature')).toBeInTheDocument();
  });

  it('renders Expired status badge', () => {
    const expiredLease = { ...baseLease, status: 'expired' as const };
    render(<LeaseCard lease={expiredLease} {...defaultHandlers} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders Terminated status badge', () => {
    const terminatedLease = { ...baseLease, status: 'terminated' as const };
    render(<LeaseCard lease={terminatedLease} {...defaultHandlers} />);

    expect(screen.getByText('Terminated')).toBeInTheDocument();
  });

  it('shows "Unknown Tenant" when no tenant data', () => {
    const noTenantLease = { ...baseLease, tenant: undefined };
    render(<LeaseCard lease={noTenantLease} {...defaultHandlers} />);

    expect(screen.getByText('Unknown Tenant')).toBeInTheDocument();
  });

  it('renders Lease Agreement title', () => {
    render(<LeaseCard lease={baseLease} {...defaultHandlers} />);

    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
  });

  it('shows expiring soon warning for active leases', () => {
    // Lease expiring in ~15 days from now
    const now = new Date();
    const expiringSoon = new Date(now);
    expiringSoon.setDate(now.getDate() + 15);

    const expiringLease = {
      ...baseLease,
      status: 'active' as const,
      lease_end: expiringSoon.toISOString().split('T')[0],
    };

    render(<LeaseCard lease={expiringLease} {...defaultHandlers} />);

    // Allow for timezone differences that may shift by 1 day
    expect(screen.getByText(/Expires in \d+ days/)).toBeInTheDocument();
  });
});
