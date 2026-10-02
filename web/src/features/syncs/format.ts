/**
 * Format ISO8601 date string to human-readable locale format.
 */
export function formatDate(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString;
    }
    return date.toLocaleString();
  } catch {
    return isoString;
  }
}

/**
 * Format monetary amount with currency code.
 */
export function formatAmount(amount: number, currency: string = 'USD'): string {
  return `${currency} ${amount.toFixed(2)}`;
}
