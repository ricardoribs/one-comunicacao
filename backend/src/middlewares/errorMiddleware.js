const env = require('../config/env');
const logger = require('../config/logger');
const multer = require('multer');

module.exports = (error, req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let publicMessage =
    statusCode >= 500 && env.isProduction ? 'Erro interno no servidor' : error.message || 'Erro interno no servidor';

  if (error instanceof multer.MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    publicMessage =
      error.code === 'LIMIT_FILE_SIZE'
        ? `Arquivo acima do limite de ${env.uploadMaxFileSizeMb} MB.`
        : 'Falha ao processar o upload do arquivo.';
  }

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
