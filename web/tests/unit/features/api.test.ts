import { describe, it, expect } from 'vitest';
import { fetchSyncAttempts, retrySyncAttempt } from '@/features/syncs/api';

describe('Syncs API client', () => {
  it('fetches list of sync attempts', async () => {
    const attempts = await fetchSyncAttempts();
    expect(attempts).toHaveLength(3);
    expect(attempts[0].orderId).toBe('ORD-10482');
  });

  it('triggers retry for a failed attempt', async () => {
    const res = await retrySyncAttempt('att-failed-02');
    expect(res.status).toBe('accepted');
    expect(res.attempt.retryOf).toBe('att-failed-02');
    expect(res.attempt.status).toBe('pending');
  });
});
