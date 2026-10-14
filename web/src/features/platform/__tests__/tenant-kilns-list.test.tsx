import { render, screen } from '@testing-library/react';
import type { TenantSiteSummaryDto } from '@brics/shared';
import { describe, expect, it } from 'vitest';
import { TenantKilnsList } from '../components/tenant-kilns-list';

const KILNS: TenantSiteSummaryDto[] = [
  {
    id: 's1',
    name: 'Varanasi Chimney #1',
    code: 'VNS-01',
    type: 'kiln',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 's2',
    name: 'Sarnath Depot',
    code: 'DEP-01',
    type: 'depot',
    isActive: false,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

describe('TenantKilnsList (PLT-09 / S3.1)', () => {
  it('renders site details, codes, types and status badges', () => {
    render(<TenantKilnsList kilns={KILNS} />);

    expect(screen.getAllByText('Varanasi Chimney #1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('VNS-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('kiln').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);

    expect(screen.getAllByText('Sarnath Depot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEP-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('depot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  it('renders an empty state when no kilns or sites are registered', () => {
    render(<TenantKilnsList kilns={[]} />);

    expect(screen.getByText('No kilns or sites found')).toBeInTheDocument();
  });
});
