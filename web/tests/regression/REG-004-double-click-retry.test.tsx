/**
 * REG-004: Prevent duplicate retry requests on rapid button double-click.
 * Issue: Rapid repeated clicks on the Retry button could trigger duplicate concurrent API calls.
 * Date: 2026-10-02
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetryButton } from '@/features/syncs/components/RetryButton';

describe('REG-004: Idempotent Retry Click Handling', () => {
  it('disables button during in-flight retry to avoid double submission', () => {
    const handleRetry = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 500)));

    const { rerender } = render(
      <RetryButton
        attemptId="att-fail-1"
        onRetry={handleRetry}
        isLoading={false}
        disabled={false}
      />
    );

    const button = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(button);

    expect(handleRetry).toHaveBeenCalledTimes(1);

    // Simulate parent state re-render with disabled/loading
    rerender(
      <RetryButton
        attemptId="att-fail-1"
        onRetry={handleRetry}
        isLoading={true}
        disabled={true}
      />
    );

    fireEvent.click(button);
    // Call count remains 1 because button is disabled
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
