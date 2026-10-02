/**
 * HubSpot HTTP client with retry and exponential backoff.
 *
 * Retry policy (analysis doc §Retry policy):
 *   - HTTP 429          → yes, honor Retry-After header when present
 *   - HTTP 500/502/503/504 → yes, exponential backoff with jitter
 *   - Network/timeout   → yes, exponential backoff with jitter
 *   - HTTP 400/422      → NO — mapping/request bug
 *   - HTTP 401/403      → NO — credential/scope error
 *   - HTTP 404          → NO (except understood race conditions)
 *
 * Defaults: 4 total attempts, base delays 500ms/1s/2s, jitter 0–250ms.
 */

export class HubSpotError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly isRetryable: boolean,
    public readonly correlationId?: string
  ) {
    super(message);
    this.name = 'HubSpotError';
  }
}

interface HubSpotClientOptions {
  accessToken: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxAttempts?: number;
}

// Base delays for retries (ms): attempt 1→500ms, 2→1000ms, 3→2000ms
const BASE_DELAYS_MS = [500, 1000, 2000];
const MAX_JITTER_MS = 250;

function jitter(): number {
  return Math.floor(Math.random() * MAX_JITTER_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HubSpotClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(options: HubSpotClientOptions) {
    this.accessToken = options.accessToken;
    this.baseUrl = (options.baseUrl ?? 'https://api.hubapi.com').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxAttempts = options.maxAttempts ?? 4;
  }

  async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}/${path.replace(/^\//, '')}`;
    let lastError: HubSpotError | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        clearTimeout(timer);

        if (response.ok) {
          // 204 No Content → return empty object
          if (response.status === 204) return {} as T;
          return (await response.json()) as T;
        }

        const status = response.status;
        const correlationId = response.headers.get('x-hubspot-correlation-id') ?? undefined;
        let bodyText = '';
        try { bodyText = await response.text(); } catch { /* ignore */ }

        const isRetryable = status === 429 || status >= 500;

        if (!isRetryable) {
          // Permanent failure — do not retry
          throw new HubSpotError(
            `HubSpot ${status}: ${bodyText.slice(0, 500)}`,
            status,
            false,
            correlationId
          );
        }

        lastError = new HubSpotError(
          `HubSpot ${status} after attempt ${attempt}: ${bodyText.slice(0, 300)}`,
          status,
          true,
          correlationId
        );

        if (attempt < this.maxAttempts) {
          // Honor Retry-After header for 429s
          let delayMs: number;
          if (status === 429) {
            const retryAfterHeader = response.headers.get('Retry-After');
            delayMs = retryAfterHeader && /^\d+$/.test(retryAfterHeader)
              ? parseInt(retryAfterHeader, 10) * 1000
              : (BASE_DELAYS_MS[attempt - 1] ?? 2000) + jitter();
          } else {
            delayMs = (BASE_DELAYS_MS[attempt - 1] ?? 2000) + jitter();
          }
          await sleep(delayMs);
        }

      } catch (err: unknown) {
        clearTimeout(timer);

        if (err instanceof HubSpotError) {
          if (!err.isRetryable) throw err;
          lastError = err;
          if (attempt < this.maxAttempts) {
            await sleep((BASE_DELAYS_MS[attempt - 1] ?? 2000) + jitter());
          }
          continue;
        }

        // Network/timeout error — retryable
        const message = err instanceof Error ? err.message : String(err);
        lastError = new HubSpotError(`HubSpot network error: ${message}`, 0, true);
        if (attempt < this.maxAttempts) {
          await sleep((BASE_DELAYS_MS[attempt - 1] ?? 2000) + jitter());
        }
      }
    }

    throw lastError ?? new HubSpotError('HubSpot request exceeded maximum attempts.', 0, true);
  }
}
