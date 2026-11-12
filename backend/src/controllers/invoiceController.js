const asyncHandler = require('../utils/asyncHandler');
const invoiceModel = require('../models/invoiceModel');
const AppError = require('../utils/AppError');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await invoiceModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.body.client_id);
  res.status(201).json(await invoiceModel.create(req.body, req.user));
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  const invoice = await invoiceModel.update(req.params.id, req.body, req.user);
  if (!invoice) {
    throw new AppError('Fatura nao encontrada.', 404);
  }
  res.json(invoice);
});
