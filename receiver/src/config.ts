export interface ReceiverConfig {
  webhookSecret: string;
  internalToken: string;
  backendUrl: string;
  port: number;
}

export function loadConfig(): ReceiverConfig {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Fatal: WEBHOOK_SECRET environment variable is required.');
  }

  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) {
    throw new Error('Fatal: INTERNAL_TOKEN environment variable is required.');
  }

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const port = parseInt(process.env.RECEIVER_PORT || '3000', 10);

  return {
    webhookSecret,
    internalToken,
    backendUrl,
    port: isNaN(port) ? 3000 : port,
  };
}
