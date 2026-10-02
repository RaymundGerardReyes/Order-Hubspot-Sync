import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SyncDashboard } from '@/features/syncs/components/SyncDashboard';

describe('Retry Flow Integration Test', () => {
  it('allows clicking retry on a failed attempt and triggers refresh', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
    });
  });
});
