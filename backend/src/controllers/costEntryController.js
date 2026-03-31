const asyncHandler = require('../utils/asyncHandler');
const costEntryModel = require('../models/costEntryModel');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await costEntryModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.body.client_id);
  res.status(201).json(await costEntryModel.create(req.body, req.user));
});
