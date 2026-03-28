const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const createScopedQuery = require('../utils/scopedQuery');
const { hasCapability } = require('../utils/access');
const { resolveRequestAccessMetadata } = require('../utils/requestMetadata');
const requestBuckets = new Map();
const presenceBuckets = new Map();

function enforceUserRateLimit(userId) {
  const key = String(userId);
  const now = Date.now();
  const current = requestBuckets.get(key);

  if (!current || now - current.startedAt > 60 * 1000) {
    requestBuckets.set(key, { count: 1, startedAt: now });
    return;
  }

  current.count += 1;
  if (current.count > 200) {
    throw new AppError('Limite de requisições por usuário excedido. Tente novamente em instantes.', 429);
  }
}

function schedulePresenceUpdate(userId, req) {
  const key = String(userId);
  const now = Date.now();
  const lastUpdate = presenceBuckets.get(key) || 0;

  if (now - lastUpdate < 60 * 1000) {
    return;
  }

  presenceBuckets.set(key, now);
  resolveRequestAccessMetadata(req)
    .then((metadata) => userModel.recordPresence(userId, metadata))
    .catch((error) => {
      logger.warn(
        {
          user_id: userId,
          error: error.message,
        },
        'Falha ao atualizar presenca do usuario.'
      );
    });
}

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new AppError('Token de autenticação não informado.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Token inválido ou expirado.', 401);
  }

  const user = await userModel.findById(payload.userId);
  if (!user || !user.is_active) {
    throw new AppError('Usuário inválido ou inativo.', 401);
  }

  req.user = user;
  req.tenant = {
    clientId: user.client_id || null,
    role: user.role,
  };
  req.db = createScopedQuery(user);
  enforceUserRateLimit(user.id);
  schedulePresenceUpdate(user.id, req);

  next();
});

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(
        {
          user_id: req.user?.id || null,
          route: req.originalUrl,
          method: req.method,
          request_id: req.requestId,
        },
        'Tentativa de acesso negado'
      );
      return next(new AppError('Acesso negado para este perfil.', 403));
    }

    next();
  };

const authorizeCapability =
  (...capabilities) =>
  (req, res, next) => {
    const allowed = capabilities.every((capability) => hasCapability(req.user, capability));

    if (!allowed) {
      logger.warn(
        {
          user_id: req.user?.id || null,
          role: req.user?.role || null,
          capabilities,
          route: req.originalUrl,
          method: req.method,
          request_id: req.requestId,
        },
        'Tentativa de acesso negado por capacidade'
      );
      return next(new AppError('Acesso negado para este perfil.', 403));
    }

    next();
  };

module.exports = {
  authenticate,
  authorize,
  authorizeCapability,
};
