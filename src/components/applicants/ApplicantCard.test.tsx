import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ApplicantCard } from './ApplicantCard';

describe('ApplicantCard', () => {
  const baseApplicant = {
    id: 'app-1',
    property_id: 'prop-1',
    unit_id: null,
    email: 'john@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '555-0123',
    status: 'invited' as const,
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
    invited_by: 'user-123',
    invited_at: '2025-01-15T12:00:00Z',
    created_at: '2025-01-15T12:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
    property: { id: 'prop-1', name: 'Sunset Apartments', address: '123 Main St' },
  };

  it('renders applicant name when both first and last name exist', () => {
    render(<ApplicantCard applicant={baseApplicant} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders email as display name when name is not available', () => {
    const noNameApplicant = {
      ...baseApplicant,
      first_name: null,
      last_name: null,
    };

    render(<ApplicantCard applicant={noNameApplicant} />);

    // The heading should show email
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('john@example.com');
  });

  it('renders property name', () => {
    render(<ApplicantCard applicant={baseApplicant} />);

    expect(screen.getByText(/Sunset Apartments/)).toBeInTheDocument();
  });

  it('renders email link', () => {
    render(<ApplicantCard applicant={baseApplicant} />);

    const emailLink = screen.getByRole('link', { name: 'john@example.com' });
    expect(emailLink).toHaveAttribute('href', 'mailto:john@example.com');
  });

  it('renders phone when available', () => {
    render(<ApplicantCard applicant={baseApplicant} />);

    const phoneLink = screen.getByRole('link', { name: '555-0123' });
    expect(phoneLink).toHaveAttribute('href', 'tel:555-0123');
  });

  it('does not render phone when not available', () => {
    const noPhoneApplicant = { ...baseApplicant, phone: null };
    render(<ApplicantCard applicant={noPhoneApplicant} />);

    expect(screen.queryByText('555-0123')).not.toBeInTheDocument();
  });

  it('renders status badge with correct label', () => {
    render(<ApplicantCard applicant={baseApplicant} />);

    expect(screen.getByText('Invited')).toBeInTheDocument();
  });

  it('renders submitted status', () => {
    const submittedApplicant = {
      ...baseApplicant,
      status: 'submitted' as const,
      application_submitted_at: '2025-01-20T12:00:00Z',
    };

    render(<ApplicantCard applicant={submittedApplicant} />);

    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('renders approved status', () => {
    const approvedApplicant = {
      ...baseApplicant,
      status: 'approved' as const,
    };

    render(<ApplicantCard applicant={approvedApplicant} />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders rejected status', () => {
    const rejectedApplicant = {
      ...baseApplicant,
      status: 'rejected' as const,
    };

    render(<ApplicantCard applicant={rejectedApplicant} />);

    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders unit info when assigned', () => {
    const withUnit = {
      ...baseApplicant,
      unit_id: 'unit-1',
      unit: { id: 'unit-1', unit_number: '201' },
    };

    render(<ApplicantCard applicant={withUnit} />);

    expect(screen.getByText(/Unit 201/)).toBeInTheDocument();
  });

  it('renders invited date', () => {
    render(<ApplicantCard applicant={baseApplicant} />);

    expect(screen.getByText(/Invited Jan 15, 2025/)).toBeInTheDocument();
  });

  it('renders submitted date when available', () => {
    const submitted = {
      ...baseApplicant,
      application_submitted_at: '2025-01-20T12:00:00Z',
    };

    render(<ApplicantCard applicant={submitted} />);

    expect(screen.getByText(/Submitted Jan 20, 2025/)).toBeInTheDocument();
  });

  it('applies cursor-pointer class when onClick is provided', () => {
    const onClick = vi.fn();
    const { container } = render(<ApplicantCard applicant={baseApplicant} onClick={onClick} />);

    // The Card should have cursor-pointer
    const card = container.firstChild;
    expect(card).toHaveClass('cursor-pointer');
  });

  it('does not apply cursor-pointer when onClick is not provided', () => {
    const { container } = render(<ApplicantCard applicant={baseApplicant} />);

    const card = container.firstChild;
    expect(card).not.toHaveClass('cursor-pointer');
  });
});
