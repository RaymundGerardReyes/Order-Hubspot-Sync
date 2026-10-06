import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SyncDashboard } from '@/features/syncs/components/SyncDashboard';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { mockSyncAttempts } from '../mocks/data/syncAttempts';

describe('SyncDashboard Extended Integration Tests', () => {
  it('renders complete dashboard header with title, subtitle, and branding icon', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    expect(screen.getByRole('heading', { level: 1, name: /order sync dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/live status of incoming orders and hubspot deal synchronisation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/live polling active/i)).toBeInTheDocument();
  });

  it('renders LIVE indicator badge with accessible label', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    const liveBadge = screen.getByLabelText('Live polling active');
    expect(liveBadge).toBeInTheDocument();
    expect(liveBadge).toHaveTextContent('LIVE');
  });

  it('loads and displays initial mock sync attempts from API', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
      expect(screen.getByText('ORD-10484')).toBeInTheDocument();
    });

    expect(screen.getByText('3 records')).toBeInTheDocument();
    expect(screen.getByText('deal-98765')).toBeInTheDocument();
  });

  it('renders empty state illustration when API returns empty dataset', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [] });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText(/no order sync attempts recorded yet/i)).toBeInTheDocument();
      expect(screen.getByText('0 records')).toBeInTheDocument();
    });
  });

  it('displays singular "1 record" counter when API returns a single record', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [mockSyncAttempts[0]] });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('1 record')).toBeInTheDocument();
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });
  });

  it('displays error alert banner when API returns HTTP 500 error', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Internal server error/i);
    });
  });

  it('clears error alert banner upon successful subsequent refresh', async () => {
    let callCount = 0;
    server.use(
      http.get('*/api/sync-attempts', () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json({ message: 'Database connection failed' }, { status: 500 });
        }
        return HttpResponse.json({ data: mockSyncAttempts });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Database connection failed/i);
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });
  });

  it('triggers manual refresh when clicking the Refresh button', async () => {
    let fetchCount = 0;
    server.use(
      http.get('*/api/sync-attempts', () => {
        fetchCount++;
        return HttpResponse.json({ data: mockSyncAttempts });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    const initialCount = fetchCount;
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetchCount).toBeGreaterThan(initialCount);
    });
  });

  it('displays retry warning alert when retry endpoint responds with 409 conflict', async () => {
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        return HttpResponse.json(
          { message: 'Only failed attempts can be retried' },
          { status: 409 }
        );
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Only failed attempts can be retried/i);
    });
  });

  it('displays retry warning alert when retry endpoint responds with 500 error', async () => {
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        return HttpResponse.json(
          { message: 'HubSpot upstream timeout' },
          { status: 500 }
        );
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/HubSpot upstream timeout/i);
    });
  });

  it('successfully triggers retry for failed attempt and schedules re-sync', async () => {
    let retryCalled = false;
    server.use(
      http.post('*/api/orders/:id/retry', ({ params }) => {
        if (params.id === 'att-failed-02' || params.id === 'ORD-10483') {
          retryCalled = true;
          return HttpResponse.json(
            {
              status: 'accepted',
              message: 'Retry scheduled',
              attempt: { ...mockSyncAttempts[1], status: 'pending', attemptNumber: 2 },
            },
            { status: 202 }
          );
        }
        return HttpResponse.json({ message: 'Not found' }, { status: 404 });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(retryCalled).toBe(true);
    });
  });

  it('renders all three status badges: SUCCESS, FAILED, and PENDING', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('SUCCESS')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });
  });

  it('renders deal ID for success record and dash "—" for missing deals', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('deal-98765')).toBeInTheDocument();
    });

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders failure detail formatted with code prefix in table row', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(
        screen.getByText('[RATE_LIMIT] HubSpot API rate limit exceeded (429)')
      ).toBeInTheDocument();
    });
  });

  it('polls periodically when pollIntervalMs is configured', async () => {
    let fetchCount = 0;
    server.use(
      http.get('*/api/sync-attempts', () => {
        fetchCount++;
        return HttpResponse.json({ data: mockSyncAttempts });
      })
    );

    render(<SyncDashboard pollIntervalMs={50} />);

    await waitFor(() => {
      expect(fetchCount).toBeGreaterThanOrEqual(1);
    });

    await waitFor(
      () => {
        expect(fetchCount).toBeGreaterThanOrEqual(2);
      },
      { timeout: 1000 }
    );
  });
});
