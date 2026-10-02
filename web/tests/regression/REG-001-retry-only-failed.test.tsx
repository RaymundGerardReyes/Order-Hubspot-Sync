/**
 * REG-001: Retry button rendered only on failed attempts.
 * Issue: Accidental display of retry buttons on success or pending attempts could allow
 * clients to trigger conflicting sync operations.
 * Date: 2026-10-02
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncTable } from '@/features/syncs/components/SyncTable';
import { mockSyncAttempts } from '../mocks/data/syncAttempts';

describe('REG-001: Retry Button Isolation', () => {
  it('renders retry button only for rows with status failed', () => {
    render(<SyncTable syncs={mockSyncAttempts} onRetry={vi.fn()} retryingId={null} />);

    // In mockSyncAttempts: att-success-01, att-failed-02, att-pending-03
    // Exactly one retry button should exist
    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    expect(retryButtons).toHaveLength(1);
  });
});
