import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/features/syncs/components/StatusBadge';
import type { SyncStatus } from '@/features/syncs/types';

describe('StatusBadge Extended Unit Tests', () => {
  it('renders "pending" with class .pending and label PENDING', () => {
    const { container } = render(<StatusBadge status="pending" />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('pending');
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: PENDING');
  });

  it('renders "processing" with class .processing and label PROCESSING', () => {
    const { container } = render(<StatusBadge status="processing" />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('processing');
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: PROCESSING');
  });

  it('renders "success" with class .success and label SUCCESS', () => {
    const { container } = render(<StatusBadge status="success" />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('success');
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: SUCCESS');
  });

  it('renders "succeeded" synonym with class .success and label SUCCESS', () => {
    const { container } = render(<StatusBadge status="succeeded" />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('success');
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: SUCCESS');
  });

  it('renders "failed" with class .failed and label FAILED', () => {
    const { container } = render(<StatusBadge status="failed" />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('failed');
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: FAILED');
  });

  it('includes aria-hidden dot indicator for visual polish', () => {
    const { container } = render(<StatusBadge status="success" />);
    const dot = container.querySelector('.status-badge-dot');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('handles unknown status string with uppercase fallback and safe aria-label', () => {
    const { container } = render(<StatusBadge status={'queued' as unknown as SyncStatus} />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(screen.getByText('QUEUED')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: QUEUED');
  });

  it('handles custom cancelled status gracefully', () => {
    const { container } = render(<StatusBadge status={'cancelled' as unknown as SyncStatus} />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: CANCELLED');
  });

  it('handles custom skipped status gracefully', () => {
    const { container } = render(<StatusBadge status={'skipped' as unknown as SyncStatus} />);
    const badge = container.querySelector('.status-badge');
    expect(badge).toBeInTheDocument();
    expect(screen.getByText('SKIPPED')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Status: SKIPPED');
  });

  it('updates dynamically when status prop changes via rerender', () => {
    const { container, rerender } = render(<StatusBadge status="pending" />);
    let badge = container.querySelector('.status-badge');
    expect(badge).toHaveClass('pending');
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    rerender(<StatusBadge status="processing" />);
    badge = container.querySelector('.status-badge');
    expect(badge).toHaveClass('processing');
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();

    rerender(<StatusBadge status="success" />);
    badge = container.querySelector('.status-badge');
    expect(badge).toHaveClass('success');
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();

    rerender(<StatusBadge status="failed" />);
    badge = container.querySelector('.status-badge');
    expect(badge).toHaveClass('failed');
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });
});
