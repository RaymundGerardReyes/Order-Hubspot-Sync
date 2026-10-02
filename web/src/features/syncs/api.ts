import { httpClient } from '../../lib/http';
import type { ApiCollectionResponse, RetryResponse, SyncAttempt } from './types';

export interface FetchSyncsOptions {
  limit?: number;
}

export interface RetrySyncResult {
  success: boolean;
  message: string;
  attemptId?: number;
}

/**
 * Fetch the latest sync attempts from the Node.js API.
 * Endpoint: GET /api/sync-attempts?limit=50
 * (analysis doc §Dashboard contract)
 */
export async function fetchSyncAttempts(options?: FetchSyncsOptions): Promise<SyncAttempt[]> {
  const response = await httpClient.get<ApiCollectionResponse<SyncAttempt> | SyncAttempt[]>(
    'api/sync-attempts',
    { params: options?.limit ? { limit: options.limit } : undefined }
  );

  if (Array.isArray(response)) {
    return response;
  }

  return response.data || [];
}

/**
 * Request a retry for a failed order or attempt.
 * Endpoint: POST /api/orders/:orderId/retry
 * (analysis doc §Dashboard contract)
 */
export async function retrySyncAttempt(identifier: string): Promise<RetryResponse> {
  return httpClient.post<RetryResponse>(
    `api/orders/${encodeURIComponent(identifier)}/retry`
  );
}
