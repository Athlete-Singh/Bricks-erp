import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductionReportPage from '@/app/(dashboard)/production/report/page';
import type { ProductionReport } from '../api';

const mockReport: ProductionReport = {
  rows: [
    {
      period: '2026-10',
      siteId: 's1',
      siteName: 'Kiln One',
      brickTypeId: 'bt1',
      grade: 'Class 1',
      goodBricks: '50000.000',
      batchCount: 5,
    },
  ],
  totals: {
    goodBricks: '50000.000',
    batchCount: 5,
  },
};

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => ({ can: () => true, sites: [{ id: 's1', name: 'Kiln One' }] }) };
});

vi.mock('@/features/masters/hooks', () => ({
  useBrickTypes: () => ({ data: { items: [{ id: 'bt1', grade: 'Class 1' }] } }),
}));

vi.mock('../api', () => ({
  fetchProductionReport: () => Promise.resolve(mockReport),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductionReportPage />
    </QueryClientProvider>,
  );
}

describe('Production report (PRD-07)', () => {
  it('renders total good bricks and summary rows', async () => {
    renderPage();

    expect(await screen.findByText('Total good bricks produced')).toBeInTheDocument();
    expect(screen.getAllByText('50,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Class 1').length).toBeGreaterThan(0);
  });
});
