import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncTable } from '@/features/syncs/components/SyncTable';
import type { SyncAttempt } from '@/features/syncs/types';

describe('SyncTable Extended Unit Tests', () => {
  const baseAttempt: SyncAttempt = {
    id: 'att-100',
    orderId: 'ORD-50001',
    status: 'failed',
    hubspotDealId: null,
    hubspotContactId: null,
    retryOf: null,
    attemptNumber: 1,
    failureCode: '401',
    failureMessage: 'HubSpot 401: Invalid credentials',
    createdAt: '2026-10-02T10:00:00Z',
  };

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <SyncTable syncs={[]} onRetry={vi.fn()} retryingId={null} isLoading={true} />
    );

    const wrapper = container.querySelector('.table-wrapper');
    expect(wrapper).toHaveAttribute('aria-busy', 'true');
    expect(wrapper).toHaveAttribute('aria-label', 'Loading sync attempts');
    const skeletonRows = container.querySelectorAll('.skeleton-row');
    expect(skeletonRows.length).toBe(5);
  });

  it('renders empty state illustration and message when syncs array is empty', () => {
    render(<SyncTable syncs={[]} onRetry={vi.fn()} retryingId={null} isLoading={false} />);

    expect(screen.getByText('Recent Sync Attempts')).toBeInTheDocument();
    expect(screen.getByText('0 records')).toBeInTheDocument();
    expect(screen.getByText(/No order sync attempts recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Send a webhook via the mock script/i)).toBeInTheDocument();
  });

  it('renders singular "1 record" when syncs has exactly one item', () => {
    render(<SyncTable syncs={[baseAttempt]} onRetry={vi.fn()} retryingId={null} />);
    expect(screen.getByText('1 record')).toBeInTheDocument();
  });

  it('renders plural "3 records" when syncs has 3 items', () => {
    const syncs: SyncAttempt[] = [
      { ...baseAttempt, id: 'att-1', orderId: 'ORD-1' },
      { ...baseAttempt, id: 'att-2', orderId: 'ORD-2' },
      { ...baseAttempt, id: 'att-3', orderId: 'ORD-3' },
    ];
    render(<SyncTable syncs={syncs} onRetry={vi.fn()} retryingId={null} />);
    expect(screen.getByText('3 records')).toBeInTheDocument();
  });

  it('renders all standard table column headers', () => {
    render(<SyncTable syncs={[baseAttempt]} onRetry={vi.fn()} retryingId={null} />);
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toEqual([
      'Order ID',
      'Status',
      'HubSpot Deal',
      'Attempt',
      'Failure Detail',
      'Timestamp',
      'Actions',
    ]);
  });

  it('displays "—" when hubspotDealId is absent and adds empty CSS class', () => {
    const { container } = render(
      <SyncTable syncs={[{ ...baseAttempt, hubspotDealId: null }]} onRetry={vi.fn()} retryingId={null} />
    );
    const dealCell = container.querySelector('.col-deal-id');
    expect(dealCell).toHaveTextContent('—');
    expect(dealCell).toHaveClass('empty');
  });

  it('displays deal ID when hubspotDealId is present and omits empty class', () => {
    const { container } = render(
      <SyncTable syncs={[{ ...baseAttempt, hubspotDealId: 'deal-889900' }]} onRetry={vi.fn()} retryingId={null} />
    );
    const dealCell = container.querySelector('.col-deal-id');
    expect(dealCell).toHaveTextContent('deal-889900');
    expect(dealCell).not.toHaveClass('empty');
  });

  it('renders attempt number #1 by default when attemptNumber is undefined', () => {
    const { container } = render(
      <SyncTable syncs={[{ ...baseAttempt, attemptNumber: undefined }]} onRetry={vi.fn()} retryingId={null} />
    );
    const attemptCell = container.querySelector('.col-attempt');
    expect(attemptCell).toHaveTextContent('#1');
  });

  it('renders attempt number with #3 when attemptNumber is 3', () => {
    const { container } = render(
      <SyncTable syncs={[{ ...baseAttempt, attemptNumber: 3 }]} onRetry={vi.fn()} retryingId={null} />
    );
    const attemptCell = container.querySelector('.col-attempt');
    expect(attemptCell).toHaveTextContent('#3');
  });

  it('renders "(retry)" tag when retryOf pointer is present', () => {
    const { container } = render(
      <SyncTable
        syncs={[{ ...baseAttempt, attemptNumber: 2, retryOf: 'att-prior-01' }]}
        onRetry={vi.fn()}
        retryingId={null}
      />
    );
    const attemptCell = container.querySelector('.col-attempt');
    expect(attemptCell).toHaveTextContent('#2(retry)');
  });

  it('does NOT render "(retry)" tag for initial non-retried attempts', () => {
    const { container } = render(
      <SyncTable syncs={[{ ...baseAttempt, retryOf: null }]} onRetry={vi.fn()} retryingId={null} />
    );
    const attemptCell = container.querySelector('.col-attempt');
    expect(attemptCell?.textContent).toBe('#1');
  });

  it('renders failure detail with tooltip title matching full error message', () => {
    const { container } = render(
      <SyncTable syncs={[baseAttempt]} onRetry={vi.fn()} retryingId={null} />
    );
    const failureCell = container.querySelector('.col-failure');
    expect(failureCell).toHaveAttribute('title', 'HubSpot 401: Invalid credentials');
    expect(failureCell).toHaveTextContent('[401] Invalid credentials');
  });

  it('renders retry button only for status failed and omits for success', () => {
    const syncs: SyncAttempt[] = [
      { ...baseAttempt, id: 'att-f', status: 'failed' },
      { ...baseAttempt, id: 'att-s', status: 'success' },
    ];
    render(<SyncTable syncs={syncs} onRetry={vi.fn()} retryingId={null} />);
    const buttons = screen.getAllByRole('button', { name: /retry/i });
    expect(buttons.length).toBe(1);
  });

  it('omits retry button for status pending and processing', () => {
    const syncs: SyncAttempt[] = [
      { ...baseAttempt, id: 'att-p', status: 'pending' },
      { ...baseAttempt, id: 'att-pr', status: 'processing' },
    ];
    render(<SyncTable syncs={syncs} onRetry={vi.fn()} retryingId={null} />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('shows loading spinner on retry button when retryingId matches attempt id', () => {
    render(<SyncTable syncs={[baseAttempt]} onRetry={vi.fn()} retryingId="att-100" />);
    expect(screen.getByRole('button', { name: /retrying/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
  });

  it('shows loading spinner on retry button when retryingId matches orderId', () => {
    render(<SyncTable syncs={[baseAttempt]} onRetry={vi.fn()} retryingId="ORD-50001" />);
    expect(screen.getByRole('button', { name: /retrying/i })).toBeInTheDocument();
  });

  it('injects responsive data-label attributes on each table cell for container queries', () => {
    const { container } = render(<SyncTable syncs={[baseAttempt]} onRetry={vi.fn()} retryingId={null} />);
    const cells = container.querySelectorAll('tbody tr td');
    const labels = Array.from(cells).map((c) => c.getAttribute('data-label'));
    expect(labels).toEqual([
      'Order ID',
      'Status',
      'HubSpot Deal',
      'Attempt',
      'Failure Detail',
      'Timestamp',
      'Actions',
    ]);
  });
});
