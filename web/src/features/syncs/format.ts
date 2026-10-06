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

/**
 * Format error message for clean human display, removing raw JSON strings and redundant code prefixes.
 */
export function formatFailureDetail(message?: string | null, code?: string | null): string {
  if (!message || !message.trim()) return '—';

  let cleaned = message.trim();

  // Strip repeated code prefixes like "HubSpot 401: " or "401: "
  if (code) {
    const prefixRegex = new RegExp(`^(?:HubSpot\\s+)?${code}[:\\s-]+`, 'i');
    cleaned = cleaned.replace(prefixRegex, '').trim();
  } else {
    cleaned = cleaned.replace(/^HubSpot\s+\d{3}[:\\s-]+/i, '').trim();
  }

  // Attempt to parse if the message is raw JSON or contains a JSON block
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.message === 'string' && parsed.message.trim()) {
          cleaned = parsed.message.trim();
        } else if (typeof parsed.error === 'string' && parsed.error.trim()) {
          cleaned = parsed.error.trim();
        }
      }
    } catch {
      // not valid JSON, leave as is
    }
  }

  // Clean long oauth doc URLs for cleaner table rendering
  cleaned = cleaned.replace(
    /This API supports OAuth 2\.0 authentication and you can find more details at https:\/\/developers\.hubspot\.com\/docs\/methods\/auth\/oauth-overview/g,
    'OAuth 2.0 or Service Key required (check HUBSPOT_ACCESS_TOKEN in .env).'
  );

  const prefix = code ? `[${code}] ` : '';
  return `${prefix}${cleaned}`;
}
