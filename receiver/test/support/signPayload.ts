import crypto from 'node:crypto';

export interface SignPayloadOptions {
  includePrefix?: boolean;
  secret?: string;
}

/**
 * Generate HMAC-SHA256 signature for test payloads.
 */
export function signPayload(
  payload: string | Buffer | object,
  options: SignPayloadOptions = {}
): string {
  const secret = options.secret || process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123';
  const includePrefix = options.includePrefix ?? true;

  const rawString = typeof payload === 'string'
    ? payload
    : Buffer.isBuffer(payload)
      ? payload.toString('utf8')
      : JSON.stringify(payload);

  const hash = crypto.createHmac('sha256', secret).update(rawString).digest('hex');
  return includePrefix ? `sha256=${hash}` : hash;
}
