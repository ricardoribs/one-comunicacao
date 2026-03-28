const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const reportModel = require('../models/reportModel');
const { sendPaginated } = require('../utils/response');
const isRecoverableSchemaError = require('../utils/isRecoverableSchemaError');

exports.list = asyncHandler(async (req, res) => {
  try {
    return sendPaginated(res, req, await reportModel.list(req.user, req.query));
  } catch (error) {
    if (!isRecoverableSchemaError(error)) {
      throw error;
    }

    logger.warn(
      {
        err: error,
        user_id: req.user?.id || null,
        route: req.originalUrl,
      },
      'Falha recuperavel ao listar relatorios. Retornando lista vazia.'
    );

    return sendPaginated(res, req, []);
  }
});
