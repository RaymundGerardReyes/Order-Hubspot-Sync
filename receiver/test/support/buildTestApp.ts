import { FastifyInstance } from 'fastify';
import { ApiConfig } from '../../src/config';
import { buildServer } from '../../src/server';

export interface TestAppOptions {
  customConfig?: Partial<ApiConfig>;
}

/**
 * Build test Fastify app instance with test configuration.
 */
export function buildTestApp(options: TestAppOptions = {}): FastifyInstance {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./data/test-order-sync.sqlite';

  const baseConfig: ApiConfig = {
    webhookSecret: process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123',
    hubspotAccessToken: process.env.HUBSPOT_ACCESS_TOKEN || 'test_hubspot_token',
    hubspotPipelineId: 'test_pipeline',
    hubspotDealStageId: 'test_stage',
    hubspotOrderIdProperty: 'external_order_id',
    hubspotRequestTimeoutMs: 2000,
    hubspotMaxAttempts: 2,
    port: 3001,
    databaseUrl: process.env.DATABASE_URL,
    ...options.customConfig,
  };

  return buildServer({ config: baseConfig });
}
