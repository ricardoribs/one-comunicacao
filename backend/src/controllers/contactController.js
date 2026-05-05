const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const contactModel = require('../models/contactModel');
const clientModel = require('../models/clientModel');
const { withTransaction } = require('../utils/db');
const { sendPaginated } = require('../utils/response');
const AppError = require('../utils/AppError');
const { normalizeClientPlan } = require('../utils/clientPlans');
const isRecoverableSchemaError = require('../utils/isRecoverableSchemaError');

exports.create = asyncHandler(async (req, res) => {
  const contact = await contactModel.create(req.body, req.user);
  res.status(201).json({
    message: 'Lead cadastrado com sucesso.',
    contact,
  });
});

exports.list = asyncHandler(async (req, res) => {
  try {
    return sendPaginated(res, req, await contactModel.list(req.user, req.query));
  } catch (error) {
    if (!isRecoverableSchemaError(error)) {
      throw error;
    }

    logger.warn(
      {
        err: error,
        user_id: req.user?.id || null,
        route: req.originalUrl,
      },
      'Falha recuperavel ao listar CRM. Retornando lista vazia.'
    );

    return sendPaginated(res, req, []);
  }
});

exports.update = asyncHandler(async (req, res) => {
  const contact = await contactModel.update(req.params.id, req.body, req.user);
  if (!contact) {
    throw new AppError('Lead nao encontrado.', 404);
  }
  res.json(contact);
});

exports.remove = asyncHandler(async (req, res) => {
  const removed = await contactModel.remove(req.params.id, req.user);
  if (!removed) {
    throw new AppError('Lead nao encontrado.', 404);
  }
  res.status(204).send();
});

exports.convert = asyncHandler(async (req, res) => {
  const contact = await contactModel.findById(req.params.id, req.user);
  if (!contact) {
    throw new AppError('Lead não encontrado.', 404);
  }

  const clientId = await withTransaction(req.user, async (dbClient) => {
    const normalizedPlan = normalizeClientPlan(req.body.plan) || 'One Start';
    const clientId = await clientModel.createWithClient(dbClient, {
      name: contact.name,
      company: contact.company || contact.name,
      manager_id: req.body.manager_id || req.user.id,
      plan: normalizedPlan,
      mrr: req.body.mrr || 0,
      segment: req.body.segment || null,
      started_at: req.body.started_at || null,
      legal_document: contact.document || null,
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.whatsapp || contact.phone,
      billing_email: contact.email,
      address_line1: contact.address_line1 || null,
      address_line2: contact.address_line2 || null,
      neighborhood: contact.neighborhood || null,
      city: contact.city || null,
      state: contact.state || null,
      zip_code: contact.zip_code || null,
      country: contact.country || null,
      notes: contact.notes || contact.message || null,
    }, req.user);

    await contactModel.markConvertedWithClient(dbClient, req.params.id, clientId, req.user);

    return clientId;
  });

  const client = await clientModel.findById(clientId, req.user);
  const updatedContact = await contactModel.findById(req.params.id, req.user);
  res.json({
    client,
    contact: updatedContact,
  });
});
