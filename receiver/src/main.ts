import { loadConfig } from './config';
import { buildServer } from './server';

async function main(): Promise<void> {
  const config = loadConfig();
  const server = buildServer({ config });

  const closeGracefully = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down receiver...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));

  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
    server.log.info(`Receiver server listening on port ${config.port}`);
  } catch (err) {
    server.log.error(err, 'Failed to start receiver server');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  });
}
