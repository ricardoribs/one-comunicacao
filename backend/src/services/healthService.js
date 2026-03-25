const db = require('../config/db');
const env = require('../config/env');
const sentry = require('../config/sentry');
const mailService = require('./mailService');
const uploadService = require('./uploadService');
const asaasGateway = require('./paymentProviders/asaasGateway');

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return { status: 'up' };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
    };
  }
}

function checkSentry() {
  const configured = Boolean(env.sentryDsn);
  const initialized = sentry.isInitialized();
  const status = configured && initialized ? 'up' : env.isProduction ? 'degraded' : 'up';

  return {
    status,
    configured,
    initialized,
  };
}

async function getLiveness() {
  const database = await checkDatabase();

  return {
    status: database.status === 'down' ? 'down' : 'ok',
    uptime: Math.round(process.uptime()),
    environment: env.nodeEnv,
    checks: {
      database,
    },
  };
}

async function getReadiness() {
  const database = await checkDatabase();
  const sentryHealth = checkSentry();
  const mailHealth = mailService.getHealth();
  const uploadHealth = uploadService.getHealth();
  const paymentHealth =
    env.paymentProvider === 'asaas'
      ? asaasGateway.getHealth()
      : {
          provider: env.paymentProvider,
          configured: true,
          breaker: null,
          status: 'up',
        };

  let status = 'ok';

  if (database.status === 'down') {
    status = 'down';
  } else if ([sentryHealth, mailHealth, uploadHealth, paymentHealth].some((check) => check.status !== 'up')) {
    status = 'degraded';
  }

  return {
    status,
    environment: env.nodeEnv,
    uptime: Math.round(process.uptime()),
    checks: {
      database,
      sentry: sentryHealth,
      mail: mailHealth,
      upload: uploadHealth,
      payment: paymentHealth,
    },
  };
}

module.exports = {
  getLiveness,
  getReadiness,
};
