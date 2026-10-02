import 'dotenv/config';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

async function main() {
  const config = loadConfig();
  const app = buildServer({ config });

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.info(`[API] Order-HubSpot Sync API listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
