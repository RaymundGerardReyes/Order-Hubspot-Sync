import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetryButton } from '@/features/syncs/components/RetryButton';

describe('RetryButton Component', () => {
  it('renders Retry button and fires onRetry with attemptId when clicked', () => {
    const handleRetry = vi.fn().mockResolvedValue(undefined);
    render(
      <RetryButton
        attemptId="att-123"
        onRetry={handleRetry}
        isLoading={false}
        disabled={false}
      />
    );

    const button = screen.getByRole('button', { name: /retry/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledWith('att-123');
  });

  it('renders loading state and is disabled when isLoading is true', () => {
    const handleRetry = vi.fn();
    render(
      <RetryButton
        attemptId="att-123"
        onRetry={handleRetry}
        isLoading={true}
        disabled={false}
      />
    );

    const button = screen.getByRole('button', { name: /retrying/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
