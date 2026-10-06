import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SyncDashboard } from '@/features/syncs/components/SyncDashboard';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { mockSyncAttempts } from '../mocks/data/syncAttempts';
import type { SyncAttempt } from '@/features/syncs/types';

describe('Dashboard End-to-End User Flow Integration Tests', () => {
  it('E2E-1: loads dashboard and displays branding header and logo', async () => {
    const { container } = render(<SyncDashboard pollIntervalMs={0} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/order sync dashboard/i);
    expect(container.querySelector('.dashboard-logo')).toBeInTheDocument();
  });

  it('E2E-2: renders live activity status badge with pulsing dot', async () => {
    const { container } = render(<SyncDashboard pollIntervalMs={0} />);

    const liveBadge = screen.getByLabelText(/live polling active/i);
    expect(liveBadge).toBeInTheDocument();
    expect(container.querySelector('.live-dot')).toBeInTheDocument();
  });

  it('E2E-3: loads sync attempts from API and renders table with all rows', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
      expect(screen.getByText('ORD-10484')).toBeInTheDocument();
    });

    expect(screen.getByText('3 records')).toBeInTheDocument();
  });

  it('E2E-4: renders correct status badge variants for each row', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('SUCCESS')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });
  });

  it('E2E-5: renders retry button exclusively for the failed attempt', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    // Exactly 1 retry button in table (the other button is the header refresh button)
    const tableRetryButtons = retryButtons.filter((b) => b.getAttribute('aria-label')?.includes('attempt'));
    expect(tableRetryButtons.length).toBe(1);
  });

  it('E2E-6: clicking retry button triggers mutation and refreshes list', async () => {
    let retryCalled = false;
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        retryCalled = true;
        return HttpResponse.json({
          status: 'accepted',
          message: 'Retry scheduled',
          attempt: { ...mockSyncAttempts[1], status: 'pending', attemptNumber: 2 },
        });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry attempt/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(retryCalled).toBe(true);
    });
  });

  it('E2E-7: displays warning banner when retrying a non-retriable order', async () => {
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        return HttpResponse.json(
          { message: 'Conflict: Order has already been synced' },
          { status: 409 }
        );
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry attempt/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Conflict: Order has already been synced/i);
    });
  });

  it('E2E-8: manual refresh button triggers API request and updates table', async () => {
    let callCount = 0;
    server.use(
      http.get('*/api/sync-attempts', () => {
        callCount++;
        return HttpResponse.json({ data: mockSyncAttempts });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    const initial = callCount;
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(callCount).toBeGreaterThan(initial);
    });
  });

  it('E2E-9: displays error banner when backend service is unavailable', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ message: 'Receiver service unreachable' }, { status: 503 });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Receiver service unreachable/i);
    });
  });

  it('E2E-10: displays empty state illustration when 0 sync attempts exist', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [] });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('0 records')).toBeInTheDocument();
      expect(screen.getByText(/no order sync attempts recorded yet/i)).toBeInTheDocument();
    });
  });

  it('E2E-11: displays Deal ID link or code for synced order and dash for failed', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('deal-98765')).toBeInTheDocument();
    });

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('E2E-12: sanitizes raw JSON error messages into human-readable text', async () => {
    const rawErrorItem: SyncAttempt = {
      id: 'att-err-99',
      orderId: 'ORD-ERR-99',
      status: 'failed',
      failureCode: '401',
      failureMessage:
        'HubSpot 401: {"message":"Authentication credentials not found. This API supports OAuth 2.0 authentication and you can find more details at https://developers.hubspot.com/docs/methods/auth/oauth-overview"}',
      createdAt: new Date().toISOString(),
    };

    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [rawErrorItem] });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-ERR-99')).toBeInTheDocument();
      expect(
        screen.getByText(/\[401\] Authentication credentials not found/i)
      ).toBeInTheDocument();
    });
  });

  it('E2E-13: injects container query data-label attributes for responsive mobile cards', async () => {
    const { container } = render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    const firstRowCells = container.querySelectorAll('tbody tr:first-child td');
    const labels = Array.from(firstRowCells).map((c) => c.getAttribute('data-label'));

    expect(labels).toContain('Order ID');
    expect(labels).toContain('Status');
    expect(labels).toContain('HubSpot Deal');
    expect(labels).toContain('Attempt');
    expect(labels).toContain('Failure Detail');
    expect(labels).toContain('Timestamp');
    expect(labels).toContain('Actions');
  });

  it('E2E-14: renders attempt count #1 and retry lineage tag (retry)', async () => {
    const retryItem: SyncAttempt = {
      id: 'att-retried-2',
      orderId: 'ORD-RETRY-LINEAGE',
      status: 'failed',
      attemptNumber: 2,
      retryOf: 'att-first-1',
      createdAt: new Date().toISOString(),
    };

    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [retryItem] });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-RETRY-LINEAGE')).toBeInTheDocument();
      expect(screen.getByText(/#2/)).toBeInTheDocument();
      expect(screen.getByText('(retry)')).toBeInTheDocument();
    });
  });

  it('E2E-15: formats timestamp into localized readable date string', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    // ISO string should not be displayed in raw format
    expect(screen.queryByText('2026-10-02T10:00:00Z')).not.toBeInTheDocument();
  });
});
