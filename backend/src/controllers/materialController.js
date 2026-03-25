const asyncHandler = require('../utils/asyncHandler');
const materialModel = require('../models/materialModel');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await materialModel.list(req.user, req.query));
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
