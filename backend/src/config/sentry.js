const Sentry = require('@sentry/node');
const env = require('./env');
const logger = require('./logger');

let enabled = false;

const SENSITIVE_KEYS = /password|senha|token|secret|authorization|cookie|set-cookie|mfa|otp|pix|boleto|barcode|qr|payload/i;

function scrubValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEYS.test(key) ? '[REDACTED]' : scrubValue(nestedValue),
      ])
    );
  }

  return value;
}

function beforeSend(event) {
  const sanitized = scrubValue(event);
  if (sanitized.request?.url) {
    sanitized.request.url = String(sanitized.request.url).split('?')[0];
  }
  if (sanitized.request?.query_string) {
    sanitized.request.query_string = '[REDACTED]';
  }
  return sanitized;
}

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
    sendDefaultPii: false,
    beforeSend,
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
