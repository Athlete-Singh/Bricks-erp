import { render, screen } from '@testing-library/react';
import type { TenantUserSummaryDto } from '@brics/shared';
import { describe, expect, it } from 'vitest';
import { TenantUsersList } from '../components/tenant-users-list';

const USERS: TenantUserSummaryDto[] = [
  {
    id: 'u1',
    name: 'Rajesh Sharma',
    email: 'rajesh@kiln.test',
    mobile: '9876543210',
    roleCode: 'owner',
    roleName: 'Owner',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u2',
    name: 'Amit Patel',
    email: null,
    mobile: '9876543211',
    roleCode: 'accountant',
    roleName: 'Accountant',
    isActive: false,
    createdAt: '2026-02-15T00:00:00.000Z',
  },
];

describe('TenantUsersList (PLT-09 / S3.1)', () => {
  it('renders table headers and user attributes with roles and badges', () => {
    render(<TenantUsersList users={USERS} />);

    expect(screen.getAllByText('Rajesh Sharma').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9876543210').length).toBeGreaterThan(0);
    expect(screen.getAllByText('rajesh@kiln.test').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);

    expect(screen.getAllByText('Amit Patel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9876543211').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Accountant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  it('renders an empty state when no users are provided', () => {
    render(<TenantUsersList users={[]} />);

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });
});
