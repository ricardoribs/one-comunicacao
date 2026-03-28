const asyncHandler = require('../utils/asyncHandler');
const messageModel = require('../models/messageModel');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await messageModel.listForUser(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  const payload = {
    sender_id: req.user.id,
    receiver_id: req.body.receiver_id,
    context_type: req.body.context_type,
    context_id: req.body.context_id,
    content: req.body.content,
  };

  res.status(201).json(await messageModel.create(payload, req.user));
});

exports.markRead = asyncHandler(async (req, res) => {
  res.json(await messageModel.markRead(req.user, req.body || {}));
});
