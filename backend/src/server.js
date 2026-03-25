const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');
const logger = require('./config/logger');
const sentry = require('./config/sentry');

const server = app.listen(env.port, () => {
  logger.info({ port: env.port, environment: env.nodeEnv }, 'Servidor iniciado');
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.warn({ signal }, 'Iniciando graceful shutdown');

  server.close(async () => {
    try {
      await db.end();
      logger.info('Conexoes com banco encerradas');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Falha ao encerrar conexoes do banco');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Timeout no graceful shutdown');
    process.exit(1);
  }, 10000).unref();
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled rejection');
  if (sentry.isInitialized()) {
    sentry.captureException(error);
  }
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  if (sentry.isInitialized()) {
    sentry.captureException(error);
  }
  process.exit(1);
});
