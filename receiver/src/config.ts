import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate paths to search for .env in current cwd and upwards to repo root
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let envLoaded = false;
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

// Auto-bootstrap from .env.example if missing
if (!envLoaded) {
  const rootDir = path.resolve(__dirname, '../../');
  const examplePath = path.resolve(rootDir, '.env.example');
  const targetPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(examplePath) && !fs.existsSync(targetPath)) {
    try {
      fs.copyFileSync(examplePath, targetPath);
      dotenv.config({ path: targetPath });
    } catch {
      // ignore
    }
  }
}

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
