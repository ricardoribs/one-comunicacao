const env = require('../config/env');
const AppError = require('../utils/AppError');
const clientModel = require('../models/clientModel');
const contactModel = require('../models/contactModel');
const asaasGateway = require('./paymentProviders/asaasGateway');

function buildCustomerPayload(source, fallbackReference) {
  return {
    name: source.contact_name || source.name,
    email: source.billing_email || source.contact_email || source.email || undefined,
    phone: source.contact_phone || source.phone || undefined,
    mobilePhone: source.contact_phone || source.whatsapp || source.phone || undefined,
    cpfCnpj: source.legal_document || source.document || undefined,
    postalCode: source.zip_code || undefined,
    address: source.address_line1 || undefined,
    province: source.neighborhood || undefined,
    externalReference: fallbackReference,
  };
}

async function ensureAsaasCustomer({ clientId, contactId, user }) {
  if (clientId) {
    const client = await clientModel.findById(clientId, user);
    if (!client) {
      throw new AppError('Cliente não encontrado.', 404);
    }
    if (client.asaas_customer_id) {
      return { customerId: client.asaas_customer_id, source: client, resolvedClientId: client.id };
    }
    const created = await asaasGateway.createCustomer(buildCustomerPayload(client, `client-${client.id}`));
    await clientModel.update(client.id, { asaas_customer_id: created.id }, user);
    return { customerId: created.id, source: client, resolvedClientId: client.id };
  }

  if (contactId) {
    const contact = await contactModel.findById(contactId, user);
    if (!contact) {
      throw new AppError('Lead não encontrado.', 404);
    }
    if (contact.asaas_customer_id) {
      return {
        customerId: contact.asaas_customer_id,
        source: contact,
        resolvedClientId: contact.converted_client_id || null,
      };
    }
    const created = await asaasGateway.createCustomer(buildCustomerPayload(contact, `contact-${contact.id}`));
    await contactModel.saveAsaasCustomerId(contact.id, created.id, user);
    return {
      customerId: created.id,
      source: contact,
      resolvedClientId: contact.converted_client_id || null,
    };
  }

  throw new AppError('Informe client_id ou contact_id para gerar a cobrança.', 400);
}

async function createExternalCharge(payload, user) {
  if (env.paymentProvider !== 'asaas') {
    return {
      provider: 'manual',
      provider_customer_id: null,
      provider_charge_id: null,
      status: 'PENDING',
      payment_link: null,
      boleto_url: null,
      boleto_barcode: null,
      pix_copy_paste: null,
      pix_qr_base64: null,
      resolved_client_id: payload.client_id || null,
      external_payload: {
        mode: 'manual',
      },
    };
  }

  const { customerId, resolvedClientId } = await ensureAsaasCustomer({
    clientId: payload.client_id,
    contactId: payload.contact_id,
    user,
  });

  const billingType = payload.payment_method === 'PAYMENT_LINK' ? 'UNDEFINED' : payload.payment_method;
  const payment = await asaasGateway.createPayment({
    customerId,
    billingType,
    dueDate: payload.due_date,
    value: payload.amount,
    description: payload.description,
    externalReference: payload.external_reference || payload.idempotency_key || undefined,
  });

  let pix = null;
  if (payload.payment_method === 'PIX') {
    pix = await asaasGateway.getPixQrCode(payment.id);
  }

  return {
    provider: 'asaas',
    provider_customer_id: customerId,
    provider_charge_id: payment.id,
    status: payment.status || 'pending',
    payment_link: payment.invoiceUrl || payment.bankSlipUrl || null,
    boleto_url: payment.bankSlipUrl || null,
    boleto_barcode: payment.nossoNumero || null,
    pix_copy_paste: pix?.payload || null,
    pix_qr_base64: pix?.encodedImage || null,
    resolved_client_id: payload.client_id || resolvedClientId || null,
    external_payload: {
      payment,
      pix,
    },
  };
}

module.exports = {
  createExternalCharge,
};
