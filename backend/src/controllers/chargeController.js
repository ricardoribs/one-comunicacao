const asyncHandler = require('../utils/asyncHandler');
const chargeModel = require('../models/chargeModel');
const chargeService = require('../services/chargeService');
const AppError = require('../utils/AppError');
const { ensureClientAccess, ensureContactAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await chargeModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  let contact = null;

  if (req.body.contact_id) {
    contact = await ensureContactAccess(req.user, req.body.contact_id);
  }

  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }

  if (contact?.converted_client_id && req.body.client_id && Number(contact.converted_client_id) !== Number(req.body.client_id)) {
    throw new AppError('O lead informado pertence a outro cliente convertido.', 400);
  }

  const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotency_key || null;
  const payload = {
    ...req.body,
    client_id: req.body.client_id || contact?.converted_client_id || null,
    idempotency_key: idempotencyKey,
  };

  if (idempotencyKey) {
    const existingCharge = await chargeModel.findByIdempotencyKey(req.user.id, idempotencyKey, req.user);
    if (existingCharge) {
      return res.status(200).json(existingCharge);
    }
  }

  try {
    const externalCharge = await chargeService.createExternalCharge(payload, req.user);
    const charge = await chargeModel.create(
      {
        ...payload,
        ...externalCharge,
        client_id: payload.client_id || externalCharge.resolved_client_id || null,
        created_by: req.user.id,
      },
      req.user
    );
    res.status(201).json(charge);
  } catch (error) {
    if (idempotencyKey && error.code === '23505') {
      const existingCharge = await chargeModel.findByIdempotencyKey(req.user.id, idempotencyKey, req.user);
      if (existingCharge) {
        return res.status(200).json(existingCharge);
      }
    }

    throw error;
  }
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  res.json(await chargeModel.update(req.params.id, req.body, req.user));
});
