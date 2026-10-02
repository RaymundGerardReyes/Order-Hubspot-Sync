import crypto from 'node:crypto';

export interface SignPayloadOptions {
  includePrefix?: boolean;
  secret?: string;
}

/**
 * Generate HMAC-SHA256 signature for test payloads.
 * Supports both options object or (payload, secret, includePrefix) positional arguments.
 */
export function signPayload(
  payload: string | Buffer | object,
  optionsOrSecret: SignPayloadOptions | string = {},
  includePrefixParam?: boolean
): string {
  let secret: string;
  let includePrefix: boolean;

  if (typeof optionsOrSecret === 'string') {
    secret = optionsOrSecret;
    includePrefix = includePrefixParam ?? true;
  } else {
    secret = optionsOrSecret.secret || process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123';
    includePrefix = optionsOrSecret.includePrefix ?? true;
  }

  const rawString = typeof payload === 'string'
    ? payload
    : Buffer.isBuffer(payload)
      ? payload.toString('utf8')
      : JSON.stringify(payload);

  const hash = crypto.createHmac('sha256', secret).update(rawString).digest('hex');
  return includePrefix ? `sha256=${hash}` : hash;
}

