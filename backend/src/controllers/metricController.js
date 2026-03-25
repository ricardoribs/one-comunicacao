const asyncHandler = require('../utils/asyncHandler');
const metricModel = require('../models/metricModel');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await metricModel.list(req.user, req.query));
});
