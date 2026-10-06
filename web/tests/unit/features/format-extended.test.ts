import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount, formatFailureDetail } from '@/features/syncs/format';

describe('formatDate Extended Unit Tests', () => {
  it('formats standard ISO UTC timestamp to locale string', () => {
    const result = formatDate('2026-10-02T12:00:00Z');
    expect(result).not.toBe('-');
    expect(result).not.toBe('2026-10-02T12:00:00Z');
  });

  it('formats ISO timestamp with positive timezone offset (+08:00)', () => {
    const result = formatDate('2026-10-02T20:00:00+08:00');
    expect(result).not.toBe('-');
    expect(typeof result).toBe('string');
  });

  it('formats ISO timestamp with negative timezone offset (-05:00)', () => {
    const result = formatDate('2026-10-02T07:00:00-05:00');
    expect(result).not.toBe('-');
    expect(typeof result).toBe('string');
  });

  it('formats leap day timestamp correctly', () => {
    const result = formatDate('2024-02-29T15:30:00Z');
    expect(result).not.toBe('-');
    expect(result).toContain('2024');
  });

  it('formats timestamps with millisecond fractions', () => {
    const result = formatDate('2026-10-02T12:00:00.999Z');
    expect(result).not.toBe('-');
    expect(typeof result).toBe('string');
  });

  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns "-" for undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('returns "-" for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('returns raw string for invalid date formats without throwing', () => {
    expect(formatDate('not-a-valid-date')).toBe('not-a-valid-date');
    expect(formatDate('2026-99-99')).toBe('2026-99-99');
  });
});

describe('formatAmount Extended Unit Tests', () => {
  it('defaults currency to USD if omitted', () => {
    expect(formatAmount(50)).toBe('USD 50.00');
  });

  it('formats standard integer numbers with two decimal places', () => {
    expect(formatAmount(100, 'USD')).toBe('USD 100.00');
    expect(formatAmount(0, 'USD')).toBe('USD 0.00');
  });

  it('rounds floating point fractional cents to two decimal places', () => {
    expect(formatAmount(12.345, 'USD')).toBe('USD 12.35');
    expect(formatAmount(12.344, 'USD')).toBe('USD 12.34');
  });

  it('formats international currencies correctly (PHP, EUR, GBP, JPY, CAD, AUD)', () => {
    expect(formatAmount(1500.5, 'PHP')).toBe('PHP 1500.50');
    expect(formatAmount(89.9, 'EUR')).toBe('EUR 89.90');
    expect(formatAmount(45.0, 'GBP')).toBe('GBP 45.00');
    expect(formatAmount(3000, 'JPY')).toBe('JPY 3000.00');
    expect(formatAmount(25.75, 'CAD')).toBe('CAD 25.75');
    expect(formatAmount(60.25, 'AUD')).toBe('AUD 60.25');
  });

  it('formats negative amounts properly', () => {
    expect(formatAmount(-45.5, 'USD')).toBe('USD -45.50');
    expect(formatAmount(-0.01, 'EUR')).toBe('EUR -0.01');
  });

  it('formats large numbers correctly', () => {
    expect(formatAmount(1000000, 'USD')).toBe('USD 1000000.00');
  });
});

describe('formatFailureDetail Extended Unit Tests', () => {
  it('returns "—" for null, undefined, or empty string', () => {
    expect(formatFailureDetail(null)).toBe('—');
    expect(formatFailureDetail(undefined)).toBe('—');
    expect(formatFailureDetail('')).toBe('—');
    expect(formatFailureDetail('   ')).toBe('—');
  });

  it('strips redundant "HubSpot 401:" prefix when code is provided', () => {
    const raw = 'HubSpot 401: Invalid token';
    expect(formatFailureDetail(raw, '401')).toBe('[401] Invalid token');
  });

  it('strips redundant "401:" prefix when code is provided', () => {
    const raw = '401: Unauthorized access';
    expect(formatFailureDetail(raw, '401')).toBe('[401] Unauthorized access');
  });

  it('strips "HubSpot 500:" prefix even when code is omitted', () => {
    const raw = 'HubSpot 500: Internal server error';
    expect(formatFailureDetail(raw)).toBe('Internal server error');
  });

  it('extracts "message" property from JSON payload', () => {
    const raw = 'HubSpot 400: {"status":"error","message":"Contact already exists","correlationId":"abc"}';
    expect(formatFailureDetail(raw, '400')).toBe('[400] Contact already exists');
  });

  it('extracts "error" property from JSON payload when message is absent', () => {
    const raw = '{"error":"Rate limit exceeded"}';
    expect(formatFailureDetail(raw, '429')).toBe('[429] Rate limit exceeded');
  });

  it('replaces verbose OAuth guidance URL with actionable developer instruction', () => {
    const raw = 'This API supports OAuth 2.0 authentication and you can find more details at https://developers.hubspot.com/docs/methods/auth/oauth-overview';
    const formatted = formatFailureDetail(raw);
    expect(formatted).toContain('OAuth 2.0 or Service Key required (check HUBSPOT_ACCESS_TOKEN in .env).');
  });

  it('handles malformed JSON gracefully without crashing', () => {
    const raw = 'HubSpot 502: {bad json string here';
    expect(formatFailureDetail(raw, '502')).toBe('[502] {bad json string here');
  });

  it('preserves clean text without JSON or prefix', () => {
    const raw = 'Database connection timed out';
    expect(formatFailureDetail(raw)).toBe('Database connection timed out');
  });

  it('handles whitespace around messages cleanly', () => {
    const raw = '   Unexpected socket hang up   ';
    expect(formatFailureDetail(raw, 'ECONNRESET')).toBe('[ECONNRESET] Unexpected socket hang up');
  });
});
