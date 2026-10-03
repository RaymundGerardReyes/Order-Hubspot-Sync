// Global test setup for receiver
process.env.DATABASE_URL = 'file:./data/test-order-sync.sqlite';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123';
process.env.INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'test_internal_shared_token_456';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
process.env.RECEIVER_PORT = '3000';
