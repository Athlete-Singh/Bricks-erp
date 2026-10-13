import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import OnboardingPage from '@/app/(dashboard)/settings/onboarding/page';
import { parseCsv, TEMPLATES } from '../csv';

let granted: string[] = ['accounts.manage'];
const previewImport = vi.fn();
const commitImport = vi.fn();

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return {
    ...actual,
    useSession: () => ({ can: (...codes: string[]) => codes.every((c) => granted.includes(c)) }),
  };
});

vi.mock('../api', () => ({
  previewImport: (...args: unknown[]) => previewImport(...args),
  commitImport: (...args: unknown[]) => commitImport(...args),
  fetchOnboardingReference: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OnboardingPage />
    </QueryClientProvider>,
  );
}

function csvFile(text: string, name = 'parties.csv'): File {
  return new File([text], name, { type: 'text/csv' });
}

describe('CSV reading', () => {
  it('keeps a comma inside a quoted field, which is how a party has two types', () => {
    const { rows } = parseCsv('name,types\n"Ramesh Sardar","sardar,supplier"\n');
    expect(rows[0]).toEqual({ name: 'Ramesh Sardar', types: 'sardar,supplier' });
  });

  it('reads a doubled quote as one quote', () => {
    const { rows } = parseCsv('name\n"Shri ""Krishna"" Builders"\n');
    expect(rows[0]!.name).toBe('Shri "Krishna" Builders');
  });

  it('strips the byte-order mark Excel writes, which would break the first heading', () => {
    const { headers } = parseCsv('﻿name,types\nA,customer\n');
    expect(headers[0]).toBe('name');
  });

  it('reads Windows line endings', () => {
    const { rows } = parseCsv('name,types\r\nA,customer\r\n');
    expect(rows).toHaveLength(1);
  });

  it('fills a short row rather than shifting the columns along', () => {
    // A trailing empty cell is often dropped by the spreadsheet; the values
    // that are there must still line up with their own headings.
    const { rows } = parseCsv('name,types,phone\nA,customer\n');
    expect(rows[0]).toEqual({ name: 'A', types: 'customer', phone: '' });
  });

  it('says so when the file has headings but nothing under them', () => {
    expect(parseCsv('name,types\n').problems[0]).toMatch(/no rows/i);
  });

  it('offers a template whose example row matches its own headings', () => {
    // A template with more headings than example cells teaches the wrong shape.
    for (const [kind, t] of Object.entries(TEMPLATES)) {
      expect(t.example.length, kind).toBe(t.columns.length);
    }
  });
});

describe('Go-live import screen (ONB-01)', () => {
  it('checks the file first and will not import until it has', async () => {
    const user = userEvent.setup();
    granted = ['accounts.manage'];
    previewImport.mockResolvedValue({ kind: 'parties', rows: [], okCount: 2, problemCount: 0, imported: false });
    renderPage();

    // Import is dead until a file has been checked — the whole point of the
    // two steps is that nobody writes a file they have not read back.
    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();

    await user.upload(
      screen.getByLabelText(/Choose the CSV/i),
      csvFile('name,types\nShri Krishna Builders,customer\nRamesh Sardar,sardar\n'),
    );
    // The file name and the count sit in separate nodes, so match the line.
    await waitFor(() =>
      expect(screen.getByText((_, el) => el?.textContent === 'parties.csv — 2 rows')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Check the file/i }));
    await waitFor(() => expect(previewImport).toHaveBeenCalled());
    expect(screen.getByText(/Nothing has been saved yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import/ })).toBeEnabled();
  });

  it('shows the line number and the reason for every row that cannot go in', async () => {
    const user = userEvent.setup();
    previewImport.mockResolvedValue({
      kind: 'parties',
      rows: [
        { line: 2, ok: true, summary: 'Shri Krishna Builders (customer)', problems: [] },
        { line: 3, ok: false, summary: '', problems: ['types: Give at least one type'] },
      ],
      okCount: 1,
      problemCount: 1,
      imported: false,
    });
    renderPage();

    await user.upload(screen.getByLabelText(/Choose the CSV/i), csvFile('name,types\nA,customer\nB,\n'));
    await user.click(screen.getByRole('button', { name: /Check the file/i }));

    await waitFor(() => expect(previewImport).toHaveBeenCalled());
    expect(screen.getByText('types: Give at least one type')).toBeInTheDocument();
    // The line number is the one in their spreadsheet, so the fix is obvious.
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 rows cannot be imported, so none were/i)).toBeInTheDocument();
    // And Import stays shut while anything is wrong.
    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();
  });

  it('refuses the whole screen to someone who may not move money', () => {
    granted = ['accounts.view'];
    renderPage();
    expect(screen.getByText(/do not have access to the go-live import/i)).toBeInTheDocument();
    granted = ['accounts.manage'];
  });
});
