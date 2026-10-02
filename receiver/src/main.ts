import { loadConfig } from './config.js';
import { buildServer } from './server.js';

async function main() {
  const config = loadConfig();
  const app = buildServer({ config });

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.info(`[API] Order-HubSpot Sync API listening on http://localhost:${config.port}`);
    if (config.hubspotAccessToken === 'pat-na1-replace-with-scoped-token') {
      console.warn(
        `\n[API] ⚠️  Notice: HUBSPOT_ACCESS_TOKEN is currently using the placeholder value.\n` +
        `     The receiver is listening on port ${config.port} and ready to accept webhooks.\n` +
        `     Set your real HubSpot Service Key in .env to sync live deals to HubSpot CRM.\n`
      );
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
