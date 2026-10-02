import 'dotenv/config';

export interface ApiConfig {
  port: number;
  webhookSecret: string;
  hubspotAccessToken: string;
  hubspotPipelineId: string;
  hubspotDealStageId: string;
  hubspotOrderIdProperty: string;
  hubspotRequestTimeoutMs: number;
  hubspotMaxAttempts: number;
  databaseUrl: string;
}

export function loadConfig(): ApiConfig {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Fatal: WEBHOOK_SECRET environment variable is required.');
  }

  const hubspotAccessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotAccessToken) {
    throw new Error('Fatal: HUBSPOT_ACCESS_TOKEN environment variable is required.');
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    webhookSecret,
    hubspotAccessToken,
    hubspotPipelineId: process.env.HUBSPOT_PIPELINE_ID || '',
    hubspotDealStageId: process.env.HUBSPOT_DEAL_STAGE_ID || '',
    hubspotOrderIdProperty: process.env.HUBSPOT_ORDER_ID_PROPERTY || 'external_order_id',
    hubspotRequestTimeoutMs: parseInt(process.env.HUBSPOT_REQUEST_TIMEOUT_MS || '10000', 10),
    hubspotMaxAttempts: parseInt(process.env.HUBSPOT_MAX_ATTEMPTS || '4', 10),
    databaseUrl: process.env.DATABASE_URL || 'file:./data/order-sync.sqlite',
  };
}
