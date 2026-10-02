import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncTable } from '@/features/syncs/components/SyncTable';
import { mockSyncAttempts } from '../../mocks/data/syncAttempts';

describe('SyncTable Component', () => {
  it('renders empty message when no sync attempts are provided', () => {
    render(<SyncTable syncs={[]} onRetry={vi.fn()} retryingId={null} />);
    expect(screen.getByText(/no order sync attempts recorded yet/i)).toBeInTheDocument();
  });

  it('renders order IDs, status badges, and HubSpot Deal ID', () => {
    render(<SyncTable syncs={mockSyncAttempts} onRetry={vi.fn()} retryingId={null} />);

    expect(screen.getByText('ORD-10482')).toBeInTheDocument();
    expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    expect(screen.getByText('ORD-10484')).toBeInTheDocument();

    expect(screen.getByText('deal-98765')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });
});
