const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const userModel = require('../models/userModel');
const { withTransaction } = require('../utils/db');
const { sendMail } = require('./mailService');
const { buildVerificationEmail, buildPasswordResetEmail } = require('./emailTemplates');
const logger = require('../config/logger');
const mfaService = require('./mfaService');
const securityAlertService = require('./securityAlertService');
const { hashToken } = require('../utils/tokenHash');

function buildUserPayload(user) {
  return {
    id: user.id,
    client_id: user.client_id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    job_title: user.job_title || null,
    avatar_url: user.avatar_url || null,
    role: user.role,
    is_active: user.is_active,
    must_change_password: Boolean(user.must_change_password),
    last_login_at: user.last_login_at,
    last_seen_at: user.last_seen_at || null,
    last_seen_location: user.last_seen_location || null,
    is_online: Boolean(user.is_online),
    client_name: user.client_name,
    client_company: user.client_company,
    mfa_enabled_at: user.mfa_enabled_at || null,
    mfa_required: mfaService.requiresMfa(user),
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      clientId: user.client_id || null,
      sessionVersion: Number(user.session_version || 0),
    },
    env.jwtSecret,
    {
      algorithm: env.jwtAlgorithm,
      expiresIn: env.jwtExpiresIn,
      jwtid: crypto.randomUUID(),
    }
  );
}

function generateTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
  };
}

function extractBearerToken(authorizationHeader = '') {
  const header = String(authorizationHeader || '');
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function revokeAccessToken(rawAccessToken, metadata = {}, executor = undefined) {
  if (!rawAccessToken) {
    return null;
  }

  let payload;
  try {
    payload = jwt.verify(rawAccessToken, env.jwtSecret, {
      algorithms: [env.jwtAlgorithm],
    });
  } catch {
    return null;
  }

  if (!payload?.jti || !payload?.userId || !payload?.exp) {
    return null;
  }

  return userModel.createRevokedAccessToken(
    {
      token_hash: hashToken(payload.jti),
      user_id: payload.userId,
      expires_at: new Date(payload.exp * 1000),
      revoked_by_ip: metadata.ip || null,
    },
    executor
  );
}

function isLikelyBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

function isPanelUser(user = {}) {
  return user.role !== 'client';
}

function ensurePanelUser(user) {
  if (!isPanelUser(user)) {
    throw new AppError('Este perfil nao possui acesso ao painel.', 403);
  }
}

function buildAuthResponse(user) {
  const accessToken = signAccessToken(user);
  return {
    accessToken,
    token: accessToken,
    expiresIn: env.jwtExpiresIn,
    user: buildUserPayload(user),
  };
}

function buildMfaChallengeResponse(user, purpose = 'login') {
  const challengeToken = mfaService.createChallengeToken(user, purpose);

  return {
    challengeToken,
    challenge_token: challengeToken,
    mfaRequired: purpose === 'login',
    mfa_required: purpose === 'login',
    mfaEnrollmentRequired: purpose === 'enroll',
    mfa_enrollment_required: purpose === 'enroll',
    mfaType: 'totp',
    mfa_type: 'totp',
    user: buildUserPayload(user),
  };
}

async function issueRefreshToken(user, metadata = {}, executor = null, rawToken = generateTokenValue()) {
  const refreshToken = rawToken;
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);

  await userModel.createRefreshToken(
    {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by_ip: metadata.ip,
      user_agent: metadata.userAgent,
    },
    executor || undefined
  );

  return {
    refreshToken,
    refreshTokenHash: tokenHash,
    expiresAt,
  };
}

async function issueAuthenticatedSession(user, metadata = {}) {
  const refresh = await issueRefreshToken(user, metadata);

  return {
    ...buildAuthResponse(user),
    refreshToken: refresh.refreshToken,
    cookieOptions: buildCookieOptions(),
  };
}

async function sendVerificationEmail(user, rawToken) {
  const verifyUrl = `${env.appBaseUrl || 'http://localhost:3000'}/api/auth/verify-email?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Confirme seu cadastro na ONE Comunicacao',
    html: buildVerificationEmail({
      appBaseUrl: env.appBaseUrl,
      userName: user.name,
      verifyUrl,
    }),
  });
}

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${env.appBaseUrl || 'http://localhost:3000'}/reset-password.html?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Redefinicao de senha - ONE Comunicacao',
    html: buildPasswordResetEmail({
      appBaseUrl: env.appBaseUrl,
      userName: user.name,
      resetUrl,
      expiresMinutes: env.passwordResetExpiresMinutes,
    }),
  });
}

async function issueEmailVerification(user) {
  const rawToken = generateTokenValue();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.emailVerificationExpiresHours * 60 * 60 * 1000);

  await userModel.createEmailVerificationToken({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  await sendVerificationEmail(user, rawToken);
}

async function loadValidatedUserById(userId) {
  const user = await userModel.findById(userId);

  if (!user) {
    throw new AppError('Usuario invalido ou inativo.', 401);
  }

  ensurePanelUser(user);

  if (!user.is_active) {
    throw new AppError('Usuario invalido ou inativo.', 401);
  }

  return user;
}

async function validatePrimaryCredentials({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new AppError('Login ou senha incorretos.', 401);
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError('Conta temporariamente bloqueada. Tente novamente mais tarde.', 423);
  }

  if (!isLikelyBcryptHash(user.password)) {
    logger.warn(
      {
        user_id: user.id,
        email: user.email,
      },
      'Usuario com hash de senha invalido ou ausente durante login.'
    );
    throw new AppError('Login ou senha incorretos.', 401);
  }

  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(password, user.password);
  } catch (error) {
    logger.warn(
      {
        user_id: user.id,
        email: user.email,
        error: error.message,
      },
      'Falha ao validar hash de senha durante o login.'
    );
    throw new AppError('Login ou senha incorretos.', 401);
  }

  if (!passwordMatches) {
    const securityState = await userModel.recordFailedLogin(user.id, env.loginLockThreshold, env.loginLockMinutes);

    if (securityState?.locked_until) {
      await securityAlertService.notify(
        'account_locked_after_bruteforce',
        {
          user_id: user.id,
          email: user.email,
          locked_until: securityState.locked_until,
        },
        {
          severity: 'high',
          dedupeKey: `account-lock:${user.id}`,
        }
      );
    }

    throw new AppError('Login ou senha incorretos.', 401);
  }

  ensurePanelUser(user);

  if (!user.is_active) {
    throw new AppError('Usuario inativo.', 401);
  }

  if (!user.email_verified_at) {
    throw new AppError('Confirme seu e-mail antes de acessar a plataforma.', 403);
  }

  return user;
}

async function prepareTotpEnrollmentForUser(user) {
  if (mfaService.isMfaEnabled(user)) {
    throw new AppError('MFA ja habilitado para este usuario.', 409);
  }

  let secret = null;

  if (user.mfa_totp_pending_secret_encrypted) {
    try {
      secret = mfaService.decryptSecret(user.mfa_totp_pending_secret_encrypted);
    } catch {
      await userModel.clearPendingMfaSecret(user.id);
    }
  }

  if (!secret) {
    secret = mfaService.buildEnrollmentSecret(user).secret;
    await userModel.storePendingMfaSecret(user.id, mfaService.encryptSecret(secret));
  }

  return mfaService.buildEnrollmentResponse(user, secret);
}

async function enableTotpEnrollmentForUser(user, otp) {
  if (mfaService.isMfaEnabled(user)) {
    throw new AppError('MFA ja habilitado para este usuario.', 409);
  }

  if (!user.mfa_totp_pending_secret_encrypted) {
    throw new AppError('Configuracao TOTP pendente nao encontrada. Reinicie o processo.', 409);
  }

  const secret = mfaService.decryptSecret(user.mfa_totp_pending_secret_encrypted);
  if (!mfaService.verifyOtp(secret, otp)) {
    throw new AppError('Codigo TOTP invalido.', 401);
  }

  await userModel.enableMfa(user.id, user.mfa_totp_pending_secret_encrypted);
  return loadValidatedUserById(user.id);
}

async function register(payload) {
  const existingUser = await userModel.findByEmail(payload.email);
  if (existingUser) {
    throw new AppError('Ja existe um usuario cadastrado com este e-mail.', 409);
  }

  const password = await bcrypt.hash(payload.password, env.bcryptRounds);
  const user = await userModel.create({
    client_id: payload.client_id || null,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    job_title: payload.job_title || null,
    avatar_url: payload.avatar_url || null,
    password,
    role: payload.role || 'designer',
    is_active: true,
    email_verified_at: null,
  });

  try {
    await issueEmailVerification(user);
  } catch (error) {
    if (user?.id) {
      try {
        await userModel.remove(user.id);
      } catch {
        // noop
      }
    }

    throw new AppError(
      `Nao foi possivel enviar o e-mail de verificacao. ${error.message || 'Confira a configuracao do provedor de e-mail e tente novamente.'}`,
      502
    );
  }

  return {
    message: 'Cadastro realizado. Verifique seu e-mail para ativar o acesso.',
  };
}

async function login({ email, password }, metadata = {}) {
  const user = await validatePrimaryCredentials({ email, password });

  if (mfaService.shouldChallengeForMfa(user)) {
    await userModel.clearLoginFailures(user.id);
    return buildMfaChallengeResponse(user, mfaService.isMfaEnabled(user) ? 'login' : 'enroll');
  }

  await userModel.resetLoginFailures(user.id, metadata);
  const freshUser = await loadValidatedUserById(user.id);
  return issueAuthenticatedSession(freshUser, metadata);
}

async function setupTotpEnrollment(challengeToken) {
  const challenge = mfaService.verifyChallengeToken(challengeToken, 'enroll');
  const user = await loadValidatedUserById(challenge.userId);
  return prepareTotpEnrollmentForUser(user);
}

async function completeTotpEnrollment(challengeToken, otp, metadata = {}) {
  const challenge = mfaService.verifyChallengeToken(challengeToken, 'enroll');
  const user = await loadValidatedUserById(challenge.userId);
  const freshUser = await enableTotpEnrollmentForUser(user, otp);
  await userModel.resetLoginFailures(user.id, metadata);
  return issueAuthenticatedSession(freshUser, metadata);
}

async function completeTotpLogin(challengeToken, otp, metadata = {}) {
  const challenge = mfaService.verifyChallengeToken(challengeToken, 'login');
  const user = await loadValidatedUserById(challenge.userId);

  if (!mfaService.isMfaEnabled(user)) {
    throw new AppError('MFA ainda nao habilitado para este usuario.', 409);
  }

  const secret = mfaService.decryptSecret(user.mfa_totp_secret_encrypted);
  if (!mfaService.verifyOtp(secret, otp)) {
    await securityAlertService.notify(
      'mfa_login_failed',
      {
        user_id: user.id,
        email: user.email,
      },
      {
        severity: 'medium',
        dedupeKey: `mfa-failed:${user.id}`,
        cooldownMs: 30000,
      }
    );
    throw new AppError('Codigo TOTP invalido.', 401);
  }

  await userModel.resetLoginFailures(user.id, metadata);
  const freshUser = await loadValidatedUserById(user.id);
  return issueAuthenticatedSession(freshUser, metadata);
}

async function setupMyTotpEnrollment(userId) {
  const user = await loadValidatedUserById(userId);
  return prepareTotpEnrollmentForUser(user);
}

async function completeMyTotpEnrollment(userId, otp) {
  const user = await loadValidatedUserById(userId);
  return enableTotpEnrollmentForUser(user, otp);
}

async function refreshAccessToken(rawRefreshToken, metadata = {}) {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token nao informado.', 401);
  }

  const tokenHash = hashToken(rawRefreshToken);

  return withTransaction(async (dbClient) => {
    const tokenRecord = await userModel.findRefreshTokenForUpdate(tokenHash, dbClient);

    if (!tokenRecord) {
      throw new AppError('Refresh token invalido.', 401);
    }

    if (tokenRecord.revoked_at || tokenRecord.replaced_by_token_hash) {
      await userModel.revokeAllRefreshTokensForUser(tokenRecord.user_id, metadata.ip, dbClient);
      await userModel.incrementSessionVersion(tokenRecord.user_id, dbClient);
      logger.warn(
        {
          user_id: tokenRecord.user_id,
          token_hash: tokenHash,
          event: 'refresh_token_replay_detected',
        },
        'Replay de refresh token detectado. Todas as sessoes foram revogadas.'
      );
      await securityAlertService.notify(
        'refresh_token_replay_detected',
        {
          user_id: tokenRecord.user_id,
          ip: metadata.ip || null,
        },
        {
          severity: 'critical',
          dedupeKey: `refresh-replay:${tokenRecord.user_id}`,
        }
      );
      throw new AppError('Sessao invalida. Faca login novamente.', 401);
    }

    if (!tokenRecord.is_active) {
      throw new AppError('Refresh token invalido.', 401);
    }

    if (new Date(tokenRecord.expires_at) <= new Date()) {
      await userModel.revokeRefreshToken(tokenHash, { revoked_by_ip: metadata.ip }, dbClient);
      throw new AppError('Refresh token expirado.', 401);
    }

    const user = await userModel.findById(tokenRecord.user_id, dbClient);
    if (!user || !user.is_active) {
      throw new AppError('Usuario invalido ou inativo.', 401);
    }
    ensurePanelUser(user);

    const nextRefreshToken = generateTokenValue();
    const nextRefreshHash = hashToken(nextRefreshToken);
    const nextRefreshExpiresAt = new Date(Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);
    const revoked = await userModel.revokeRefreshToken(
      tokenHash,
      {
        revoked_by_ip: metadata.ip,
        replaced_by_token_hash: nextRefreshHash,
      },
      dbClient
    );

    if (!revoked) {
      throw new AppError('Refresh token invalido.', 401);
    }

    await userModel.createRefreshToken(
      {
        user_id: user.id,
        token_hash: nextRefreshHash,
        expires_at: nextRefreshExpiresAt,
        created_by_ip: metadata.ip,
        user_agent: metadata.userAgent,
      },
      dbClient
    );

    return {
      ...buildAuthResponse(user),
      refreshToken: nextRefreshToken,
      cookieOptions: buildCookieOptions(),
    };
  });
}

async function logout(rawRefreshToken, metadata = {}, rawAccessToken = null) {
  await withTransaction(async (dbClient) => {
    if (rawAccessToken) {
      await revokeAccessToken(rawAccessToken, metadata, dbClient);
    }

    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = hashToken(rawRefreshToken);
    await userModel.revokeRefreshToken(tokenHash, { revoked_by_ip: metadata.ip }, dbClient);
  });
}

async function logoutAll(userId, ip) {
  await withTransaction(async (dbClient) => {
    await userModel.revokeAllRefreshTokensForUser(userId, ip, dbClient);
    await userModel.incrementSessionVersion(userId, dbClient);
  });
}

async function verifyEmail(rawToken) {
  const tokenHash = hashToken(rawToken || '');
  const token = await userModel.findEmailVerificationToken(tokenHash);

  if (!token || token.used_at || new Date(token.expires_at) <= new Date()) {
    throw new AppError('Token de verificacao invalido ou expirado.', 400);
  }

  await userModel.consumeEmailVerificationToken(tokenHash);
  await userModel.markEmailVerified(token.user_id);
}

async function forgotPassword(email) {
  const user = await userModel.findByEmail(email);
  if (!user || !user.is_active || !isPanelUser(user)) {
    return;
  }

  const rawToken = generateTokenValue();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.passwordResetExpiresMinutes * 60 * 1000);

  await userModel.createPasswordResetToken({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  await sendPasswordResetEmail(user, rawToken);
}

async function resetPassword(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken || '');
  const token = await userModel.findPasswordResetToken(tokenHash);

  if (!token || token.used_at || new Date(token.expires_at) <= new Date()) {
    throw new AppError('Token de redefinicao invalido ou expirado.', 400);
  }

  const user = await userModel.findById(token.user_id);
  if (!user || !user.is_active || !isPanelUser(user)) {
    throw new AppError('Token de redefinicao invalido ou expirado.', 400);
  }

  const password = await bcrypt.hash(newPassword, env.bcryptRounds);
  await withTransaction(async (dbClient) => {
    await userModel.update(token.user_id, { password, must_change_password: false }, dbClient);
    await userModel.consumePasswordResetToken(tokenHash, dbClient);
    await userModel.revokeAllRefreshTokensForUser(token.user_id, null, dbClient);
    await userModel.incrementSessionVersion(token.user_id, dbClient);
  });
}

module.exports = {
  register,
  login,
  logout,
  logoutAll,
  refreshAccessToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  extractBearerToken,
  revokeAccessToken,
  buildCookieOptions,
  setupTotpEnrollment,
  completeTotpEnrollment,
  completeTotpLogin,
  setupMyTotpEnrollment,
  completeMyTotpEnrollment,
};
