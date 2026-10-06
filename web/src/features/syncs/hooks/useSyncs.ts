'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSyncAttempts } from '../api';
import { SyncAttempt } from '../types';

export interface UseSyncsReturn {
  syncs: SyncAttempt[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSyncs(pollIntervalMs: number = 5000): UseSyncsReturn {
  const [syncs, setSyncs] = useState<SyncAttempt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSyncAttempts({ limit: 50 });
      if (isMountedRef.current) {
        setError(null);
        setSyncs(data);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sync attempts';
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    if (pollIntervalMs > 0) {
      const interval = setInterval(refresh, pollIntervalMs);
      return () => {
        isMountedRef.current = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh, pollIntervalMs]);

  return { syncs, isLoading, error, refresh };
}
