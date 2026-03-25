const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const contentType = req.headers['content-type'] || '';
  const contentLength = Number(req.headers['content-length'] || 0);
  const hasStreamedBody = Boolean(req.headers['transfer-encoding']);
  const allowed = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'];

  if (!contentType && contentLength === 0 && !hasStreamedBody) {
    return next();
  }

  if (!allowed.some((type) => contentType.startsWith(type))) {
    return next(new AppError('Content-Type nao suportado para esta requisicao.', 415));
  }

  next();
};
