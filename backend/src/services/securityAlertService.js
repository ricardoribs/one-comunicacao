const env = require('../config/env');
const logger = require('../config/logger');

const alertCooldowns = new Map();
const DEFAULT_COOLDOWN_MS = 60 * 1000;

function getHealth() {
  const configured = Boolean(env.securityAlertWebhookUrl);
  return {
    configured,
    status: configured || !env.isProduction ? 'up' : 'degraded',
  };
}

async function notify(event, payload = {}, options = {}) {
  const dedupeKey = options.dedupeKey || event;
  const cooldownMs = Number(options.cooldownMs || DEFAULT_COOLDOWN_MS);
  const lastTriggeredAt = alertCooldowns.get(dedupeKey) || 0;

  if (Date.now() - lastTriggeredAt < cooldownMs) {
    return false;
  }

  alertCooldowns.set(dedupeKey, Date.now());

  logger.warn(
    {
      event,
      severity: options.severity || 'high',
      alerting_configured: Boolean(env.securityAlertWebhookUrl),
      payload,
    },
    'Evento de seguranca relevante detectado.'
  );

  if (!env.securityAlertWebhookUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.securityAlertTimeoutMs);

  try {
    const response = await fetch(env.securityAlertWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        severity: options.severity || 'high',
        source: 'one-comunicacao-backend',
        occurred_at: new Date().toISOString(),
        payload,
      }),
      signal: controller.signal,
    });

    return response.ok;
  } catch (error) {
    logger.warn(
      {
        event,
        error: error.message,
      },
      'Falha ao enviar alerta de seguranca ao webhook externo.'
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  getHealth,
  notify,
};
