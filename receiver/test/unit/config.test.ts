import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config';

describe('API Config Loader Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads valid configuration when all required environment variables are present', () => {
    process.env.WEBHOOK_SECRET = 'secret_test_123';
    process.env.HUBSPOT_ACCESS_TOKEN = 'pat-test-token-456';
    process.env.PORT = '3001';

    const config = loadConfig();
    expect(config.webhookSecret).toBe('secret_test_123');
    expect(config.hubspotAccessToken).toBe('pat-test-token-456');
    expect(config.port).toBe(3001);
  });

  it('throws an error when WEBHOOK_SECRET is missing', () => {
    delete process.env.WEBHOOK_SECRET;
    process.env.HUBSPOT_ACCESS_TOKEN = 'pat-test-token-456';

    expect(() => loadConfig()).toThrowError(/WEBHOOK_SECRET/);
  });

  it('throws an error when HUBSPOT_ACCESS_TOKEN is missing', () => {
    process.env.WEBHOOK_SECRET = 'secret_test_123';
    delete process.env.HUBSPOT_ACCESS_TOKEN;

    expect(() => loadConfig()).toThrowError(/HUBSPOT_ACCESS_TOKEN/);
  });

  it('defaults port to 3001 if not specified', () => {
    process.env.WEBHOOK_SECRET = 'secret_test_123';
    process.env.HUBSPOT_ACCESS_TOKEN = 'pat-test-token-456';
    delete process.env.PORT;

    const config = loadConfig();
    expect(config.port).toBe(3001);
  });
});
