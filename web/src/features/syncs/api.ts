import { httpClient } from '../../lib/http';
import { ApiCollectionResponse, RetryResponse, SyncAttempt } from './types';

export interface FetchSyncsOptions {
  limit?: number;
}

export interface RetrySyncResult {
  success: boolean;
  message: string;
  attempt?: SyncAttempt;
}

/**
 * Fetch the latest sync attempts from the backend.
 */
export async function fetchSyncAttempts(options?: FetchSyncsOptions): Promise<SyncAttempt[]> {
  const response = await httpClient.get<ApiCollectionResponse<SyncAttempt> | SyncAttempt[]>('syncs', {
    params: options ? { limit: options.limit } : undefined,
  });

  if (Array.isArray(response)) {
    return response;
  }

  return response.data || [];
}

/**
 * Request a retry for a specific failed sync attempt.
 */
export async function retrySyncAttempt(attemptId: string): Promise<RetryResponse> {
  return httpClient.post<RetryResponse>(`syncs/${encodeURIComponent(attemptId)}/retry`);
}
