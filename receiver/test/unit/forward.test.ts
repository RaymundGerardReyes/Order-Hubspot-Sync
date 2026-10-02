import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardOrder } from '../../src/forward';
import validOrder from '../fixtures/orders/valid-order.json';

describe('Forward Service Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('forwards payload to backend with X-Internal-Token and X-Request-Id', async () => {
    const mockResponse = {
      status: 202,
      json: vi.fn().mockResolvedValue({ status: 'accepted' }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await forwardOrder(
      'http://localhost:8000',
      'token_xyz',
      validOrder,
      'req_12345'
    );

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/internal/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Internal-Token': 'token_xyz',
        'X-Request-Id': 'req_12345',
      },
      body: JSON.stringify(validOrder),
    });

    expect(result.statusCode).toBe(202);
    expect(result.data).toEqual({ status: 'accepted' });
  });

  it('handles backend returning duplicate 200 response', async () => {
    const mockResponse = {
      status: 200,
      json: vi.fn().mockResolvedValue({ status: 'duplicate', message: 'Order already synced' }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await forwardOrder(
      'http://localhost:8000',
      'token_xyz',
      validOrder,
      'req_12345'
    );

    expect(result.statusCode).toBe(200);
    expect(result.data).toEqual({ status: 'duplicate', message: 'Order already synced' });
  });
});
