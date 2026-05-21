const Sentry = require('@sentry/node');
const env = require('./env');
const logger = require('./logger');

let enabled = false;

function initSentry() {
  if (!env.sentryDsn) {
    if (env.isProduction) {
      logger.warn('[Sentry] SENTRY_DSN ausente em producao. Erros permanecerao apenas no logger.');
    }
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    tracesSampleRate: env.sentryTracesSampleRate,
    integrations: typeof Sentry.expressIntegration === 'function' ? [Sentry.expressIntegration()] : undefined,
  });

  enabled = true;
}

function isInitialized() {
  return enabled;
}

function captureException(error) {
  if (enabled) {
    Sentry.captureException(error);
  }
}

function requestHandler() {
  return (_req, _res, next) => next();
}

function setupExpressErrorHandler(app) {
  if (!enabled) {
    return;
  }

  if (typeof Sentry.setupExpressErrorHandler === 'function') {
    Sentry.setupExpressErrorHandler(app);
    return;
  }

  if (typeof Sentry.expressErrorHandler === 'function') {
    app.use(Sentry.expressErrorHandler());
    return;
  }

  app.use((err, _req, _res, next) => {
    captureException(err);
    next(err);
  });
}

function errorHandler() {
  if (!enabled) {
    return (err, _req, _res, next) => next(err);
  }

  if (typeof Sentry.expressErrorHandler === 'function') {
    return Sentry.expressErrorHandler();
  }

  return (err, _req, _res, next) => {
    captureException(err);
    next(err);
  };
}

module.exports = {
  initSentry,
  isInitialized,
  captureException,
  requestHandler,
  setupExpressErrorHandler,
  errorHandler,
};
