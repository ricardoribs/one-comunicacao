const asyncHandler = require('../utils/asyncHandler');
const taskModel = require('../models/taskModel');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await taskModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  res.status(201).json(await taskModel.create(req.body, req.user));
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  res.json(await taskModel.update(req.params.id, req.body, req.user));
});

exports.remove = asyncHandler(async (req, res) => {
  await taskModel.remove(req.params.id, req.user);
  res.status(204).send();
});
