const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const createScopedQuery = require('../utils/scopedQuery');
const { hasCapability } = require('../utils/access');
const { resolveRequestAccessMetadata } = require('../utils/requestMetadata');
const { hashToken } = require('../utils/tokenHash');

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
    throw new AppError('Limite de requisicoes por usuario excedido. Tente novamente em instantes.', 429);
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

function isPasswordChangeAllowedRoute(req) {
  const pathname = String(req.originalUrl || '').split('?')[0];

  return (
    (req.method === 'GET' && pathname === '/api/auth/me')
    || (req.method === 'POST' && pathname === '/api/auth/logout-all')
    || (req.method === 'GET' && pathname === '/api/users/me/profile')
    || (req.method === 'PATCH' && pathname === '/api/users/me/password')
  );
}

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new AppError('Token de autenticacao nao informado.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, {
      algorithms: [env.jwtAlgorithm],
    });
  } catch {
    throw new AppError('Token invalido ou expirado.', 401);
  }

  if (!payload?.jti || payload.sessionVersion === undefined) {
    throw new AppError('Token invalido ou expirado.', 401);
  }

  const user = await userModel.findById(payload.userId);
  if (!user || !user.is_active) {
    throw new AppError('Usuario invalido ou inativo.', 401);
  }

  if (Number(payload.sessionVersion) !== Number(user.session_version || 0)) {
    throw new AppError('Sessao revogada. Faca login novamente.', 401);
  }

  const revokedAccessToken = await userModel.findRevokedAccessToken(hashToken(payload.jti));
  if (revokedAccessToken) {
    throw new AppError('Sessao revogada. Faca login novamente.', 401);
  }

  if (user.role === 'client') {
    throw new AppError('Este perfil nao possui acesso ao painel.', 403);
  }

  if (user.must_change_password && !isPasswordChangeAllowedRoute(req)) {
    throw new AppError('Altere sua senha antes de continuar.', 403);
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
  (req, _res, next) => {
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
  (req, _res, next) => {
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
