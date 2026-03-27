const env = require('../config/env');
const logger = require('../config/logger');
const CircuitBreaker = require('../utils/circuitBreaker');

const isProduction = process.env.NODE_ENV === 'production';
const hasResendKey = Boolean(process.env.RESEND_API_KEY);

if (isProduction && !hasResendKey) {
  throw new Error('[mailService] RESEND_API_KEY ausente em produção. Configure a variável antes de subir o servidor.');
}

const mailBreaker = new CircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 30000,
  timeoutMessage: 'Serviço de e-mail temporariamente indisponível.',
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        return response;
      }

      let providerMessage = '';
      try {
        const payload = await response.json();
        providerMessage = payload?.message || payload?.error || '';
      } catch (_error) {
        try {
          providerMessage = await response.text();
        } catch (__error) {
          providerMessage = '';
        }
      }

      lastError = new Error(
        providerMessage
          ? `Email provider respondeu ${response.status}: ${providerMessage}`
          : `Email provider respondeu ${response.status}`
      );
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }

    if (attempt < retries) {
      await sleep(300 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

async function sendWithResend({ to, subject, html }) {
  const response = await mailBreaker.run(() =>
    fetchWithRetry('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })
  );

  return response.json();
}

async function sendMail(payload) {
  if (isProduction && !hasResendKey) {
    throw new Error('[mailService] Tentativa de envio sem RESEND_API_KEY em produção.');
  }

  if (env.emailProvider === 'resend' && env.resendApiKey) {
    return sendWithResend(payload);
  }

  if (!isProduction) {
    logger.info(
      {
        to: payload.to,
        subject: payload.subject,
      },
      '[MAIL MOCK]'
    );

    logger.debug({ html: payload.html }, 'Conteudo do email');
    return { id: 'mock', mock: true };
  }

  throw new Error('[mailService] Envio de e-mail indisponível em produção. Verifique EMAIL_PROVIDER e RESEND_API_KEY.');
}

module.exports = {
  sendMail,
  getHealth() {
    const configured =
      env.emailProvider === 'log' ||
      (env.emailProvider === 'resend' && Boolean(env.resendApiKey) && Boolean(env.emailFrom));
    const breaker = mailBreaker.getState();

    return {
      provider: env.emailProvider,
      configured,
      breaker,
      status: configured && !breaker.open ? 'up' : 'degraded',
    };
  },
};
