import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SyncDashboard } from '@/features/syncs/components/SyncDashboard';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { mockSyncAttempts } from '../mocks/data/syncAttempts';
import type { SyncAttempt } from '@/features/syncs/types';

describe('SyncDashboard Comprehensive Integration Tests (Network, Polling & Accessibility)', () => {
  it('renders table with aria-label and scope="col" on all headers', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /sync attempts/i })).toBeInTheDocument();
    });

    const headers = screen.getAllByRole('columnheader');
    headers.forEach((header) => {
      expect(header).toHaveAttribute('scope', 'col');
    });
  });

  it('renders initial loading state with aria-busy="true"', () => {
    const { container } = render(<SyncDashboard pollIntervalMs={0} />);
    const tableWrapper = container.querySelector('.table-wrapper');
    expect(tableWrapper).toHaveAttribute('aria-busy', 'true');
  });

  it('removes aria-busy attribute once initial loading completes', async () => {
    const { container } = render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    const tableWrapper = container.querySelector('.table-wrapper');
    expect(tableWrapper).not.toHaveAttribute('aria-busy');
  });

  it('displays error alert banner when initial API request fails with 503', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ message: 'Service Unavailable' }, { status: 503 });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Service Unavailable/i);
    });
  });

  it('clears error alert and renders items upon successful manual refresh', async () => {
    let attempts = 0;
    server.use(
      http.get('*/api/sync-attempts', () => {
        attempts++;
        if (attempts === 1) {
          return HttpResponse.json({ message: 'Temporary Gateway Error' }, { status: 502 });
        }
        return HttpResponse.json({ data: mockSyncAttempts });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Temporary Gateway Error/i);
    });

    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });
  });

  it('adds newly arrived orders dynamically when polling occurs', async () => {
    let pollCount = 0;
    const initialList = [mockSyncAttempts[0]];
    const expandedList = [
      ...mockSyncAttempts,
      {
        id: 'att-new-99',
        orderId: 'ORD-POLL-NEW',
        status: 'success' as const,
        hubspotDealId: 'deal-new-99',
        hubspotContactId: 'contact-new-99',
        createdAt: new Date().toISOString(),
      },
    ];

    server.use(
      http.get('*/api/sync-attempts', () => {
        pollCount++;
        return HttpResponse.json({ data: pollCount > 1 ? expandedList : initialList });
      })
    );

    render(<SyncDashboard pollIntervalMs={60} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByText('ORD-POLL-NEW')).toBeInTheDocument();
      },
      { timeout: 1500 }
    );
  });

  it('displays warning alert when retry encounters 409 Conflict', async () => {
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        return HttpResponse.json(
          { message: 'Order is currently processing and cannot be retried' },
          { status: 409 }
        );
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Order is currently processing/i);
    });
  });

  it('displays warning alert when retry encounters network 500 error', async () => {
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        return HttpResponse.json(
          { message: 'Database transaction lock timeout' },
          { status: 500 }
        );
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Database transaction lock timeout/i);
    });
  });

  it('clears prior retry warning when a subsequent retry request begins', async () => {
    let callNum = 0;
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        callNum++;
        if (callNum === 1) {
          return HttpResponse.json({ message: 'Temporary retry lock' }, { status: 409 });
        }
        return HttpResponse.json({
          status: 'accepted',
          message: 'Retry accepted',
          attempt: { ...mockSyncAttempts[1], status: 'pending' },
        });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Temporary retry lock/i);
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('triggers mutation and schedules re-sync on failed order', async () => {
    let retryAttempted = false;
    server.use(
      http.post('*/api/orders/:id/retry', () => {
        retryAttempted = true;
        return HttpResponse.json({
          status: 'accepted',
          message: 'Retry scheduled',
          attempt: { ...mockSyncAttempts[1], status: 'pending' },
        });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(retryAttempted).toBe(true);
    });
  });

  it('renders deal ID link or text for successful order', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('deal-98765')).toBeInTheDocument();
    });
  });

  it('renders "—" dash placeholder for failed order without deal ID', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('formats failure detail with code and readable message in table row', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(
        screen.getByText('[RATE_LIMIT] HubSpot API rate limit exceeded (429)')
      ).toBeInTheDocument();
    });
  });

  it('renders LIVE indicator with live-dot element', async () => {
    const { container } = render(<SyncDashboard pollIntervalMs={0} />);

    const liveIndicator = screen.getByLabelText('Live polling active');
    expect(liveIndicator).toBeInTheDocument();
    const dot = container.querySelector('.live-dot');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders "0 records" and empty state when dataset is empty', async () => {
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

  it('renders "1 record" counter for single entry', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [mockSyncAttempts[0]] });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('1 record')).toBeInTheDocument();
    });
  });

  it('renders plural "3 records" counter for 3 entries', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('3 records')).toBeInTheDocument();
    });
  });

  it('renders heading with level 1 and proper accessible title', () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /order sync dashboard/i })
    ).toBeInTheDocument();
  });

  it('renders subtitle with operational description', () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    expect(
      screen.getByText(/live status of incoming orders and hubspot deal synchronisation/i)
    ).toBeInTheDocument();
  });

  it('disables Refresh button while refresh is in flight', async () => {
    server.use(
      http.get('*/api/sync-attempts', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ data: mockSyncAttempts });
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshBtn);

    expect(refreshBtn).toBeDisabled();
    expect(refreshBtn).toHaveTextContent(/refreshing/i);

    await waitFor(() => {
      expect(refreshBtn).not.toBeDisabled();
    });
  });

  it('cleans up interval on component unmount without error', () => {
    const { unmount } = render(<SyncDashboard pollIntervalMs={100} />);
    expect(() => unmount()).not.toThrow();
  });

  it('renders attempt number with leading # prefix in attempt column', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      const attempts = screen.getAllByText(/#1/);
      expect(attempts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders retry button with proper aria-label', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      const retryBtn = screen.getByRole('button', { name: /retry attempt/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });

  it('does not display retry button for successful orders', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [mockSyncAttempts[0]] }); // success item
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('does not display retry button for pending orders', async () => {
    server.use(
      http.get('*/api/sync-attempts', () => {
        return HttpResponse.json({ data: [mockSyncAttempts[2]] }); // pending item
      })
    );

    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10484')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});
