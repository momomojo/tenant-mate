import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';
import { Home, DollarSign, Users, Wrench } from 'lucide-react';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Total Properties',
    value: '12',
    icon: Home,
    description: 'Properties under management',
    trend: 'Active',
    trendUp: true,
  };

  it('renders title, value, and description', () => {
    render(<StatCard {...defaultProps} />);

    expect(screen.getByText('Total Properties')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Properties under management')).toBeInTheDocument();
  });

  it('renders trend text', () => {
    render(<StatCard {...defaultProps} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies green color for positive trend', () => {
    render(<StatCard {...defaultProps} trendUp={true} trend="+5% this month" />);

    const trendElement = screen.getByText('+5% this month');
    expect(trendElement.className).toContain('text-status-success');
  });

  it('applies red color for negative trend', () => {
    render(<StatCard {...defaultProps} trendUp={false} trend="-2% this month" />);

    const trendElement = screen.getByText('-2% this month');
    expect(trendElement.className).toContain('text-status-error');
  });

  it('renders with different icons', () => {
    const { rerender } = render(<StatCard {...defaultProps} icon={DollarSign} title="Revenue" value="$5,000" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();

    rerender(<StatCard {...defaultProps} icon={Users} title="Tenants" value="25" />);
    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();

    rerender(<StatCard {...defaultProps} icon={Wrench} title="Maintenance" value="3" />);
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders zero value correctly', () => {
    render(<StatCard {...defaultProps} value="0" description="No open requests" />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No open requests')).toBeInTheDocument();
  });

  it('renders long values with truncation class', () => {
    render(<StatCard {...defaultProps} value="$1,234,567" />);

    const valueElement = screen.getByText('$1,234,567');
    expect(valueElement.className).toContain('line-clamp-1');
  });
});
