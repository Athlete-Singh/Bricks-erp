import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('hides itself when everything fits on one page', () => {
    const { container } = render(<Pagination meta={{ page: 1, limit: 25, total: 12 }} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides itself when there are no rows at all', () => {
    const { container } = render(<Pagination meta={{ page: 1, limit: 25, total: 0 }} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reports which rows are on screen', () => {
    render(<Pagination meta={{ page: 2, limit: 25, total: 60 }} onPageChange={vi.fn()} />);

    expect(screen.getByText('26–50 of 60')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('clamps the last page to the real row count', () => {
    render(<Pagination meta={{ page: 3, limit: 25, total: 60 }} onPageChange={vi.fn()} />);
    expect(screen.getByText('51–60 of 60')).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination meta={{ page: 1, limit: 25, total: 60 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

    rerender(<Pagination meta={{ page: 3, limit: 25, total: 60 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('moves a page at a time', async () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={{ page: 2, limit: 25, total: 60 }} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('does not navigate while a page is still loading', async () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={{ page: 2, limit: 25, total: 60 }} onPageChange={onPageChange} isFetching />);

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
