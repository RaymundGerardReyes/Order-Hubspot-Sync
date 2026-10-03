import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount, formatFailureDetail } from '@/features/syncs/format';

describe('Format Utility Functions', () => {
  it('formats valid ISO date string', () => {
    const formatted = formatDate('2026-10-02T12:00:00Z');
    expect(formatted).not.toBe('-');
    expect(formatted).not.toBe('2026-10-02T12:00:00Z');
  });

  it('handles empty or null date gracefully', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });

  it('formats monetary amount with currency prefix', () => {
    expect(formatAmount(450.0, 'PHP')).toBe('PHP 450.00');
    expect(formatAmount(99.99, 'USD')).toBe('USD 99.99');
  });

  it('formats raw JSON HubSpot 401 error into clean readable text', () => {
    const rawError = 'HubSpot 401: {"status":"error","message":"Authentication credentials not found. This API supports OAuth 2.0 authentication and you can find more details at https://developers.hubspot.com/docs/methods/auth/oauth-overview","correlationId":"01a10182-76b4-7d86-95ab-44aa7ab95b8d","category":"INVALID_AUTHENTICATION"}';
    const formatted = formatFailureDetail(rawError, '401');
    expect(formatted).toContain('[401] Authentication credentials not found.');
    expect(formatted).not.toContain('{"status":"error"');
    expect(formatted).not.toContain('correlationId');
  });

  it('handles empty failure messages gracefully', () => {
    expect(formatFailureDetail(null)).toBe('—');
    expect(formatFailureDetail('')).toBe('—');
  });
});
