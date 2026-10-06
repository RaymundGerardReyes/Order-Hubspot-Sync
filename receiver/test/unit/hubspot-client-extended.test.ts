import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubSpotClient, HubSpotError } from '../../src/hubspot/client';

describe('HubSpotClient Extended Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('injects Bearer authorization token and default headers', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'deal_1' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const client = new HubSpotClient({ accessToken: 'my-service-key-123' });
    await client.request('GET', 'crm/v3/objects/deals/deal_1');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.hubapi.com/crm/v3/objects/deals/deal_1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-service-key-123',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      })
    );
  });

  it('uses custom baseUrl and normalizes trailing slashes', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'deal_2' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const client = new HubSpotClient({
      accessToken: 'token',
      baseUrl: 'https://custom-hubspot-mock.local/',
    });
    await client.request('GET', '/crm/v3/objects/deals/deal_2');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://custom-hubspot-mock.local/crm/v3/objects/deals/deal_2',
      expect.anything()
    );
  });

  it('serializes request body to JSON string on POST requests', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'contact_new' }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    );

    const client = new HubSpotClient({ accessToken: 'token' });
    const payload = { properties: { email: 'test@example.com', firstname: 'Alice' } };
    await client.request('POST', 'crm/v3/objects/contacts', payload);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  it('leaves body undefined on GET requests without payload', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const client = new HubSpotClient({ accessToken: 'token' });
    await client.request('GET', 'crm/v3/objects/deals');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: undefined,
      })
    );
  });

  it('returns empty object on HTTP 204 No Content response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    );

    const client = new HubSpotClient({ accessToken: 'token' });
    const result = await client.request('DELETE', 'crm/v3/objects/deals/123');

    expect(result).toEqual({});
  });

  it('extracts clean error message from JSON response with message field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Property external_order_id does not exist' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new HubSpotClient({ accessToken: 'token' });
    try {
      await client.request('POST', 'crm/v3/objects/deals', {});
      expect.fail('Expected request to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HubSpotError);
      const hubErr = err as HubSpotError;
      expect(hubErr.statusCode).toBe(400);
      expect(hubErr.isRetryable).toBe(false);
      expect(hubErr.message).toContain('Property external_order_id does not exist');
    }
  });

  it('extracts clean error message from JSON response with error field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Scope crm.objects.deals.write missing' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new HubSpotClient({ accessToken: 'token' });
    await expect(client.request('POST', 'crm/v3/objects/deals', {})).rejects.toThrow(
      'Scope crm.objects.deals.write missing'
    );
  });

  it('handles non-JSON error responses gracefully', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('<html>Bad Gateway</html>', { status: 400 })
    );

    const client = new HubSpotClient({ accessToken: 'token' });
    try {
      await client.request('POST', 'crm/v3/objects/deals', {});
      expect.fail('Expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HubSpotError);
      expect((err as HubSpotError).message).toContain('Bad Gateway');
    }
  });

  it('captures x-hubspot-correlation-id header when present on error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Validation failed' }), {
        status: 400,
        headers: { 'x-hubspot-correlation-id': 'corr-abc-123' },
      })
    );

    const client = new HubSpotClient({ accessToken: 'token' });
    try {
      await client.request('POST', 'crm/v3/objects/deals', {});
      expect.fail('Expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HubSpotError);
      expect((err as HubSpotError).correlationId).toBe('corr-abc-123');
    }
  });

  it('does not retry permanent 404 Not Found error', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Deal not found' }), { status: 404 })
    );

    const client = new HubSpotClient({ accessToken: 'token', maxAttempts: 3 });
    await expect(client.request('GET', 'crm/v3/objects/deals/999999')).rejects.toThrow(HubSpotError);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on HTTP 502 Bad Gateway and succeeds on 2nd attempt', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'deal_recovered' }), { status: 200 }));

    const client = new HubSpotClient({ accessToken: 'token', timeoutMs: 500, maxAttempts: 3 });
    const result = await client.request('GET', 'crm/v3/objects/deals/100');

    expect(result).toEqual({ id: 'deal_recovered' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('retries on HTTP 504 Gateway Timeout and succeeds on 2nd attempt', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('Gateway Timeout', { status: 504 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'deal_timeout_recovered' }), { status: 200 }));

    const client = new HubSpotClient({ accessToken: 'token', timeoutMs: 500, maxAttempts: 3 });
    const result = await client.request('GET', 'crm/v3/objects/deals/101');

    expect(result).toEqual({ id: 'deal_timeout_recovered' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('marks network AbortError as retryable and throws after exhausting attempts', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';

    vi.spyOn(global, 'fetch').mockRejectedValue(abortErr);

    const client = new HubSpotClient({ accessToken: 'token', timeoutMs: 50, maxAttempts: 2 });
    try {
      await client.request('GET', 'crm/v3/objects/deals/102');
      expect.fail('Expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HubSpotError);
      expect((err as HubSpotError).isRetryable).toBe(true);
      expect((err as HubSpotError).message).toContain('The operation was aborted');
    }
  });

  it('marks generic network errors as retryable', async () => {
    const networkErr = new Error('ECONNRESET');

    vi.spyOn(global, 'fetch').mockRejectedValue(networkErr);

    const client = new HubSpotClient({ accessToken: 'token', timeoutMs: 50, maxAttempts: 2 });
    try {
      await client.request('GET', 'crm/v3/objects/deals/103');
      expect.fail('Expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HubSpotError);
      expect((err as HubSpotError).isRetryable).toBe(true);
      expect((err as HubSpotError).message).toContain('ECONNRESET');
    }
  });
});
