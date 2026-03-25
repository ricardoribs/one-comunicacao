const asyncHandler = require('../utils/asyncHandler');
const clientModel = require('../models/clientModel');
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
  res.json(await clientModel.update(req.params.id, req.body, req.user));
});

exports.remove = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.params.id);
  await clientModel.remove(req.params.id, req.user);
  res.status(204).send();
});
