import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import './catalog/models/category.js';

async function start() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  await connectDatabase(config.mongodbUri, logger);

  const app = createApp(config);
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API server started');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown requested');
    server.close(async (error) => {
      if (error) {
        logger.error({ err: error }, 'HTTP server failed to close cleanly');
        process.exitCode = 1;
      }
      await disconnectDatabase(logger);
    });
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  process.stderr.write(`Backend startup failed: ${message}\n`);
  process.exitCode = 1;
});
