import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SyncDashboard } from '@/features/syncs/components/SyncDashboard';

describe('SyncDashboard Integration Test', () => {
  it('loads sync attempts from backend and renders dashboard components', async () => {
    render(<SyncDashboard pollIntervalMs={0} />);

    expect(screen.getByText(/order sync dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ORD-10482')).toBeInTheDocument();
      expect(screen.getByText('ORD-10483')).toBeInTheDocument();
      expect(screen.getByText('ORD-10484')).toBeInTheDocument();
    });

    expect(screen.getByText('deal-98765')).toBeInTheDocument();
  });
});
