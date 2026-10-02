'use client';

import { useCallback, useEffect, useState } from 'react';
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

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSyncAttempts({ limit: 50 });
      setSyncs(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sync attempts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    if (pollIntervalMs > 0) {
      const interval = setInterval(refresh, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [refresh, pollIntervalMs]);

  return { syncs, isLoading, error, refresh };
}
