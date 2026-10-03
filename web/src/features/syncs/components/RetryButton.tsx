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
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="button"
      className="btn btn-primary-sm"
      onClick={() => onRetry(attemptId)}
      disabled={isDisabled}
      aria-label={isLoading ? `Retrying attempt ${attemptId}` : `Retry attempt ${attemptId}`}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Retrying…
        </>
      ) : (
        <>
          <svg
            aria-hidden="true"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          Retry
        </>
      )}
    </button>
  );
}
