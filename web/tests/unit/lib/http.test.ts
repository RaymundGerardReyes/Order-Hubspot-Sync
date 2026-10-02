import { describe, it, expect } from 'vitest';
import { HttpClient, HttpError } from '@/lib/http';

describe('HttpClient Utility', () => {
  const client = new HttpClient('http://localhost:8000/api');

  it('performs GET request and parses JSON data', async () => {
    const data = await client.get<{ data: Array<{ orderId: string }> }>('sync-attempts');
    expect(data.data).toBeDefined();
    expect(data.data[0].orderId).toBe('ORD-10482');
  });

  it('throws HttpError when server responds with 4xx or 5xx', async () => {
    await expect(client.get('unknown-route')).rejects.toThrow(HttpError);
  });
});
