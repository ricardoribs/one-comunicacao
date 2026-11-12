const asyncHandler = require('../utils/asyncHandler');
const clientModel = require('../models/clientModel');
const AppError = require('../utils/AppError');
const { ensureClientAccess, sanitizeClientForUser } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  const clients = await clientModel.list(req.user, req.query);
  return sendPaginated(
    res,
    req,
    clients.map((client) => sanitizeClientForUser(client, req.user))
  );
});

exports.create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    req.body.manager_id = req.user.id;
  }
  res.status(201).json(await clientModel.create(req.body, req.user));
});

exports.update = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.params.id);
  const client = await clientModel.update(req.params.id, req.body, req.user);
  if (!client) {
    throw new AppError('Cliente nao encontrado.', 404);
  }
  res.json(client);
});

exports.remove = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.params.id);
  const removed = await clientModel.remove(req.params.id, req.user);
  if (!removed) {
    throw new AppError('Cliente nao encontrado.', 404);
  }
  res.status(204).send();
});
