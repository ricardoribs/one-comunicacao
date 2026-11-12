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

function respondWithAuthResult(res, result) {
  if (result.refreshToken && result.cookieOptions) {
    setRefreshCookie(res, result.refreshToken, result.cookieOptions);
  }

  res.json({
    accessToken: result.accessToken || null,
    token: result.token || null,
    expiresIn: result.expiresIn || null,
    user: result.user || null,
    challengeToken: result.challengeToken || null,
    challenge_token: result.challenge_token || null,
    mfaRequired: Boolean(result.mfaRequired),
    mfa_required: Boolean(result.mfa_required),
    mfaEnrollmentRequired: Boolean(result.mfaEnrollmentRequired),
    mfa_enrollment_required: Boolean(result.mfa_enrollment_required),
    mfaType: result.mfaType || result.mfa_type || null,
    mfa_type: result.mfa_type || result.mfaType || null,
  });
}

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, await tokenMetadata(req));
  respondWithAuthResult(res, result);
});

exports.refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshAccessToken(req.cookies?.[env.refreshCookieName], await tokenMetadata(req));
  respondWithAuthResult(res, result);
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(
    req.cookies?.[env.refreshCookieName],
    await tokenMetadata(req),
    authService.extractBearerToken(req.headers.authorization)
  );
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

exports.setupTotpEnrollment = asyncHandler(async (req, res) => {
  const result = await authService.setupTotpEnrollment(req.body.challenge_token);
  res.json(result);
});

exports.completeTotpEnrollment = asyncHandler(async (req, res) => {
  const result = await authService.completeTotpEnrollment(req.body.challenge_token, req.body.otp, await tokenMetadata(req));
  respondWithAuthResult(res, result);
});

exports.completeTotpLogin = asyncHandler(async (req, res) => {
  const result = await authService.completeTotpLogin(req.body.challenge_token, req.body.otp, await tokenMetadata(req));
  respondWithAuthResult(res, result);
});

exports.me = asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      client_id: req.user.client_id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || null,
      job_title: req.user.job_title || null,
      avatar_url: req.user.avatar_url || null,
      role: req.user.role,
      is_active: req.user.is_active,
      last_login_at: req.user.last_login_at || null,
      last_seen_at: req.user.last_seen_at || null,
      last_seen_location: req.user.last_seen_location || null,
      is_online: Boolean(req.user.is_online),
      email_verified_at: req.user.email_verified_at || null,
      mfa_enabled_at: req.user.mfa_enabled_at || null,
      mfa_required: env.mfaRequiredRoles.includes(req.user.role),
      created_at: req.user.created_at || null,
      client_name: req.user.client_name,
      client_company: req.user.client_company,
    },
  });
});
