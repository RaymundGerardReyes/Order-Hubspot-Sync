import React from 'react';

export interface RetryButtonProps {
  attemptId: string;
  onRetry: (attemptId: string) => Promise<unknown>;
  disabled?: boolean;
  isLoading?: boolean;
}

export function RetryButton({
  attemptId,
  onRetry,
  disabled = false,
  isLoading = false,
}: RetryButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onRetry(attemptId)}
      disabled={disabled || isLoading}
      style={{
        padding: '4px 10px',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: '#FFFFFF',
        backgroundColor: disabled || isLoading ? '#9CA3AF' : '#2563EB',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
      }}
    >
      {isLoading ? 'Retrying...' : 'Retry'}
    </button>
  );
}
