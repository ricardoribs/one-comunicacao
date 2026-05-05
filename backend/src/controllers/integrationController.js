const asyncHandler = require('../utils/asyncHandler');
const integrationModel = require('../models/integrationModel');
const AppError = require('../utils/AppError');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await integrationModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.body.client_id);
  res.json(await integrationModel.create(req.body, req.user));
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }

  const integration = await integrationModel.update(req.params.id, req.body, req.user);
  if (!integration) {
    throw new AppError('Integracao nao encontrada.', 404);
  }
  res.json(integration);
});

exports.remove = asyncHandler(async (req, res) => {
  const removed = await integrationModel.remove(req.params.id, req.user);
  if (!removed) {
    throw new AppError('Integracao nao encontrada.', 404);
  }
  res.status(204).send();
});
