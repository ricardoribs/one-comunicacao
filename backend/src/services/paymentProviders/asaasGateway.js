const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const CircuitBreaker = require('../../utils/circuitBreaker');

const asaasBreaker = new CircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 30000,
  timeoutMessage: 'Gateway de pagamento temporariamente indisponível.',
});

async function request(path, options = {}) {
  if (!env.asaasApiKey) {
    throw new AppError('ASAAS_API_KEY não configurada.', 500);
  }

  const response = await asaasBreaker.run(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      return await fetch(`${env.asaasApiUrl}${path}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          access_token: env.asaasApiKey,
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(
      data.errors?.[0]?.description || data.message || 'Falha ao comunicar com o Asaas.',
      response.status
    );
  }

  return data;
}

async function createCustomer(customer) {
  return request('/customers', {
    method: 'POST',
    body: {
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      mobilePhone: customer.mobilePhone || undefined,
      cpfCnpj: customer.cpfCnpj || undefined,
      postalCode: customer.postalCode || undefined,
      address: customer.address || undefined,
      addressNumber: customer.addressNumber || undefined,
      province: customer.province || undefined,
      externalReference: customer.externalReference || undefined,
    },
  });
}

async function createPayment(charge) {
  return request('/payments', {
    method: 'POST',
    body: {
      customer: charge.customerId,
      billingType: charge.billingType,
      dueDate: charge.dueDate,
      value: charge.value,
      description: charge.description,
      externalReference: charge.externalReference || undefined,
    },
  });
}

async function getPixQrCode(paymentId) {
  return request(`/payments/${paymentId}/pixQrCode`);
}

module.exports = {
  createCustomer,
  createPayment,
  getPixQrCode,
  getHealth() {
    const configured = Boolean(env.asaasApiUrl) && Boolean(env.asaasApiKey);
    const breaker = asaasBreaker.getState();

    return {
      provider: 'asaas',
      configured,
      breaker,
      status: configured && !breaker.open ? 'up' : 'degraded',
    };
  },
};
