const asyncHandler = require('../utils/asyncHandler');
const reportModel = require('../models/reportModel');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await reportModel.list(req.user, req.query));
});
