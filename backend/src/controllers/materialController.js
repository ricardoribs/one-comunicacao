const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const materialModel = require('../models/materialModel');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');
const isRecoverableSchemaError = require('../utils/isRecoverableSchemaError');

exports.list = asyncHandler(async (req, res) => {
  try {
    return sendPaginated(res, req, await materialModel.list(req.user, req.query));
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
      'Falha recuperavel ao listar materiais. Retornando lista vazia.'
    );

    return sendPaginated(res, req, []);
  }
});

exports.create = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.body.client_id);
  res.status(201).json(await materialModel.create({ ...req.body, uploaded_by: req.user.id }, req.user));
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  res.json(await materialModel.update(req.params.id, req.body, req.user));
});

exports.remove = asyncHandler(async (req, res) => {
  const material = await materialModel.findById(req.params.id, req.user);
  if (material) {
    await ensureClientAccess(req.user, material.client_id);
    await materialModel.remove(req.params.id, req.user);
  }
  res.status(204).send();
});
