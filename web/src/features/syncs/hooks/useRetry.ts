'use client';

import { useState } from 'react';
import { retrySyncAttempt } from '../api';
import { SyncAttempt } from '../types';

export interface UseRetryReturn {
  isRetrying: boolean;
  retryingId: string | null;
  retryError: string | null;
  triggerRetry: (attemptId: string) => Promise<SyncAttempt | null>;
}

export function useRetry(onSuccess?: () => void): UseRetryReturn {
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const triggerRetry = async (attemptId: string): Promise<SyncAttempt | null> => {
    setIsRetrying(true);
    setRetryingId(attemptId);
    setRetryError(null);

    try {
      const response = await retrySyncAttempt(attemptId);
      if (onSuccess) {
        onSuccess();
      }
      return response.attempt;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry failed';
      setRetryError(msg);
      return null;
    } finally {
      setIsRetrying(false);
      setRetryingId(null);
    }
  };

  return { isRetrying, retryingId, retryError, triggerRetry };
}
