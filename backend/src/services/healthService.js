const db = require('../config/db');
const env = require('../config/env');
const sentry = require('../config/sentry');
const mailService = require('./mailService');
const uploadService = require('./uploadService');
const asaasGateway = require('./paymentProviders/asaasGateway');
const securityAlertService = require('./securityAlertService');
const { hasDatabaseSslCa } = require('../utils/databaseSsl');

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return { status: 'up' };
  } catch {
    return {
      status: 'down',
    };
  }
}

function checkDatabaseTls() {
  const configured = !env.databaseSslRequired || hasDatabaseSslCa({
    caFilePath: env.databaseSslCaFile,
    caPem: env.databaseSslCaPem,
  });
  return {
    status: configured ? 'up' : 'down',
    required: env.databaseSslRequired,
    configured,
  };
}

function checkSentry() {
  const configured = Boolean(env.sentryDsn);
  const initialized = sentry.isInitialized();
  const status = configured && initialized ? 'up' : env.isProduction ? 'degraded' : 'up';

  return {
    status,
    configured,
    initialized,
    required: env.sentryRequired,
  };
}

function checkMfa() {
  const configured = env.mfaRequiredRoles.length === 0 || Boolean(env.mfaEncryptionKey);
  return {
    status: configured ? 'up' : 'down',
    configured,
    required_roles: env.mfaRequiredRoles,
  };
}

async function getPublicHealth() {
  const database = await checkDatabase();

  return {
    status: database.status === 'down' ? 'degraded' : 'ok',
    database: database.status,
  };
}

async function getInternalHealth() {
  const database = await checkDatabase();
  const databaseTls = checkDatabaseTls();
  const sentryHealth = checkSentry();
  const mailHealth = mailService.getHealth();
  const uploadHealth = uploadService.getHealth();
  const alertingHealth = securityAlertService.getHealth();
  const mfaHealth = checkMfa();
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

  if (database.status === 'down' || databaseTls.status === 'down' || mfaHealth.status === 'down') {
    status = 'down';
  } else if ([sentryHealth, mailHealth, uploadHealth, paymentHealth, alertingHealth].some((check) => check.status !== 'up')) {
    status = 'degraded';
  }

  return {
    status,
    environment: env.nodeEnv,
    uptime: Math.round(process.uptime()),
    checks: {
      database,
      database_tls: databaseTls,
      sentry: sentryHealth,
      mail: mailHealth,
      upload: uploadHealth,
      payment: paymentHealth,
      alerting: alertingHealth,
      mfa: mfaHealth,
    },
  };
}

module.exports = {
  getPublicHealth,
  getInternalHealth,
  getLiveness: getPublicHealth,
  getReadiness: getInternalHealth,
};
