const env = require('../config/env');
const logger = require('../config/logger');

module.exports = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const publicMessage =
    statusCode >= 500 && env.isProduction ? 'Erro interno no servidor' : error.message || 'Erro interno no servidor';

  logger[statusCode >= 500 ? 'error' : 'warn']({
    err: error,
    request_id: req.requestId,
    route: req.originalUrl,
    method: req.method,
    user_id: req.user?.id || null,
  });

  res.status(statusCode).json({
    message: publicMessage,
    request_id: req.requestId,
  });
};
