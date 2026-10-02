import { OrderPayload } from './schema';

export interface ForwardResult {
  statusCode: number;
  data: unknown;
}

/**
 * Forward verified order payload to Laravel backend internal endpoint.
 */
export async function forwardOrder(
  backendUrl: string,
  internalToken: string,
  payload: OrderPayload,
  requestId: string
): Promise<ForwardResult> {
  const targetUrl = `${backendUrl.replace(/\/$/, '')}/api/internal/orders`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Internal-Token': internalToken,
      'X-Request-Id': requestId,
    },
    body: JSON.stringify(payload),
  });

  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch {
    responseData = await response.text();
  }

  return {
    statusCode: response.status,
    data: responseData,
  };
}
