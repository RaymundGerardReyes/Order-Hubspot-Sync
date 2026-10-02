import { describe, expect, it, vi, afterEach } from 'vitest';
import { HubSpotClient, HubSpotError } from '../../src/hubspot/client';

describe('HubSpotClient Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully returns data on 200 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'deal_123' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const client = new HubSpotClient({ accessToken: 'pat-test', timeoutMs: 1000, maxAttempts: 2 });
    const result = await client.request('GET', 'crm/v3/objects/deals/123');
    expect(result).toEqual({ id: 'deal_123' });
  });

  it('does NOT retry on permanent 400 or 401 client errors', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    );

    const client = new HubSpotClient({ accessToken: 'bad-token', timeoutMs: 1000, maxAttempts: 3 });
    await expect(client.request('GET', 'crm/v3/objects/deals/123')).rejects.toThrow(HubSpotError);

    // Verified only called once (no retry loop on 401)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds when subsequent attempt returns 200', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limit' }), { status: 429, headers: { 'Retry-After': '0' } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'deal_retry_ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

    const client = new HubSpotClient({ accessToken: 'pat-test', timeoutMs: 1000, maxAttempts: 3 });
    const result = await client.request('GET', 'crm/v3/objects/deals/123');

    expect(result).toEqual({ id: 'deal_retry_ok' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 and exhausts attempts when upstream stays down', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Service unavailable' }), { status: 503 })
    );

    const client = new HubSpotClient({ accessToken: 'pat-test', timeoutMs: 500, maxAttempts: 2 });
    await expect(client.request('GET', 'crm/v3/objects/deals/123')).rejects.toThrow(/HubSpot 503/);
  });
});
