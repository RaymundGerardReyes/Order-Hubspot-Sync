import { FastifyInstance } from 'fastify';
import { ReceiverConfig } from '../../src/config';
import { buildServer } from '../../src/server';

export interface TestAppOptions {
  customConfig?: Partial<ReceiverConfig>;
}

/**
 * Build test Fastify app instance with injected configuration.
 */
export function buildTestApp(options: TestAppOptions = {}): FastifyInstance {
  const baseConfig: ReceiverConfig = {
    webhookSecret: process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123',
    internalToken: process.env.INTERNAL_TOKEN || 'test_internal_shared_token_456',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
    port: 3000,
    ...options.customConfig,
  };

  return buildServer({ config: baseConfig });
}
