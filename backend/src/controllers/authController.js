const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const env = require('../config/env');
const logger = require('../config/logger');
const { buildRequestAccessMetadata, resolveRequestAccessMetadata } = require('../utils/requestMetadata');

async function tokenMetadata(req) {
  try {
    return await resolveRequestAccessMetadata(req);
  } catch (error) {
    logger.warn(
      {
        request_id: req.requestId,
        route: req.originalUrl,
        error: error.message,
      },
      'Falha ao resolver metadata de acesso. Seguindo com metadata basica.'
    );
    return buildRequestAccessMetadata(req);
  }
}

function setRefreshCookie(res, refreshToken, cookieOptions) {
  res.cookie(env.refreshCookieName, refreshToken, cookieOptions);
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/api/auth',
  });
}

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, await tokenMetadata(req));
  setRefreshCookie(res, result.refreshToken, result.cookieOptions);
  res.json({
    accessToken: result.accessToken,
    token: result.token,
    expiresIn: result.expiresIn,
    user: result.user,
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshAccessToken(req.cookies?.[env.refreshCookieName], await tokenMetadata(req));
  setRefreshCookie(res, result.refreshToken, result.cookieOptions);
  res.json({
    accessToken: result.accessToken,
    token: result.token,
    expiresIn: result.expiresIn,
    user: result.user,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[env.refreshCookieName], await tokenMetadata(req));
  clearRefreshCookie(res);
  res.status(204).send();
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id, req.ip);
  clearRefreshCookie(res);
  res.status(204).send();
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json({
    message: 'Se o e-mail informado estiver cadastrado, você receberá as instruções para redefinir sua senha.',
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({
    message: 'Senha redefinida com sucesso.',
  });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.json({
    message: 'E-mail verificado com sucesso.',
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      client_id: req.user.client_id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      client_name: req.user.client_name,
      client_company: req.user.client_company,
    },
  });
});
