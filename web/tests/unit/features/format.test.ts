import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount } from '@/features/syncs/format';

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
});
