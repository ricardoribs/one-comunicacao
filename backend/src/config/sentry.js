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
  errorHandler,
};
