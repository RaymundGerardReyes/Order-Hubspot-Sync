import crypto from 'node:crypto';

export interface SendWebhookOptions {
  receiverUrl: string;
  payload: Record<string, unknown>;
  secret: string;
  signatureHeaderName?: string;
  prefix?: boolean;
}

export async function sendSignedWebhook(options: SendWebhookOptions): Promise<Response> {
  const {
    receiverUrl,
    payload,
    secret,
    signatureHeaderName = 'X-Signature',
    prefix = true,
  } = options;

  const rawBody = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const signature = prefix ? `sha256=${hash}` : hash;

  return fetch(`${receiverUrl.replace(/\/$/, '')}/webhooks/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [signatureHeaderName]: signature,
    },
    body: rawBody,
  });
}
