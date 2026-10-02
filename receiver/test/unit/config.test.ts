import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config';

describe('Receiver Config Loader Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads valid configuration when all required environment variables are present', () => {
    process.env.WEBHOOK_SECRET = 'secret_test_123';
    process.env.INTERNAL_TOKEN = 'internal_token_456';
    process.env.BACKEND_URL = 'http://backend:8000';
    process.env.RECEIVER_PORT = '4000';

    const config = loadConfig();
    expect(config.webhookSecret).toBe('secret_test_123');
    expect(config.internalToken).toBe('internal_token_456');
    expect(config.backendUrl).toBe('http://backend:8000');
    expect(config.port).toBe(4000);
  });

  it('throws an error when WEBHOOK_SECRET is missing', () => {
    delete process.env.WEBHOOK_SECRET;
    process.env.INTERNAL_TOKEN = 'internal_token_456';

    expect(() => loadConfig()).toThrowError(/WEBHOOK_SECRET/);
  });

  it('throws an error when INTERNAL_TOKEN is missing', () => {
    process.env.WEBHOOK_SECRET = 'secret_test_123';
    delete process.env.INTERNAL_TOKEN;

    expect(() => loadConfig()).toThrowError(/INTERNAL_TOKEN/);
  });

  it('defaults port to 3000 if not specified or malformed', () => {
    process.env.WEBHOOK_SECRET = 'secret_test_123';
    process.env.INTERNAL_TOKEN = 'internal_token_456';
    delete process.env.RECEIVER_PORT;

    const config = loadConfig();
    expect(config.port).toBe(3000);
  });
});
