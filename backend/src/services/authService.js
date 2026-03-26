const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const userModel = require('../models/userModel');
const { withTransaction } = require('../utils/db');
const { sendMail } = require('./mailService');
const { buildVerificationEmail, buildPasswordResetEmail } = require('./emailTemplates');

function buildUserPayload(user) {
  return {
    id: user.id,
    client_id: user.client_id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    last_login_at: user.last_login_at,
    client_name: user.client_name,
    client_company: user.client_company,
  };
}

function signAccessToken(user) {
  return jwt.sign({ userId: user.id, role: user.role, clientId: user.client_id || null }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function generateTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
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

function buildAuthResponse(user) {
  const accessToken = signAccessToken(user);
  return {
    accessToken,
    token: accessToken,
    expiresIn: env.jwtExpiresIn,
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

async function register(payload) {
  const existingUser = await userModel.findByEmail(payload.email);
  if (existingUser) {
    throw new AppError('Ja existe um usuario cadastrado com este e-mail', 409);
  }

  const password = await bcrypt.hash(payload.password, env.bcryptRounds);
  const user = await userModel.create({
    client_id: payload.client_id || null,
    name: payload.name,
    email: payload.email,
    password,
    role: payload.role || 'client',
    is_active: true,
    email_verified_at: null,
  });

  try {
    await issueEmailVerification(user);
  } catch (error) {
    if (user?.id) {
      try {
        await userModel.remove(user.id);
      } catch (_cleanupError) {
        // noop: preserve original delivery error to the caller
      }
    }

    throw new AppError(
      `Nao foi possivel enviar o e-mail de verificacao. ${error.message || 'Confira a configuracao do Resend e tente novamente.'}`,
      502
    );
  }

  return {
    message: 'Cadastro realizado. Verifique seu e-mail para ativar o acesso.',
  };
}

async function login({ email, password }, metadata = {}) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new AppError('E-mail ou senha invalidos', 401);
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError('Conta temporariamente bloqueada. Tente novamente mais tarde.', 423);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    await userModel.recordFailedLogin(user.id, env.loginLockThreshold, env.loginLockMinutes);
    throw new AppError('E-mail ou senha invalidos', 401);
  }

  if (!user.is_active) {
    throw new AppError('Usuario inativo', 401);
  }

  if (!user.email_verified_at) {
    throw new AppError('Confirme seu e-mail antes de acessar a plataforma.', 403);
  }

  await userModel.resetLoginFailures(user.id);
  const freshUser = await userModel.findById(user.id);
  const refresh = await issueRefreshToken(freshUser, metadata);

  return {
    ...buildAuthResponse(freshUser),
    refreshToken: refresh.refreshToken,
    cookieOptions: buildCookieOptions(),
  };
}

async function refreshAccessToken(rawRefreshToken, metadata = {}) {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token nao informado', 401);
  }

  const tokenHash = hashToken(rawRefreshToken);

  return withTransaction(async (dbClient) => {
    const tokenRecord = await userModel.findRefreshTokenForUpdate(tokenHash, dbClient);

    if (!tokenRecord || tokenRecord.revoked_at || !tokenRecord.is_active) {
      throw new AppError('Refresh token invalido', 401);
    }

    if (new Date(tokenRecord.expires_at) <= new Date()) {
      await userModel.revokeRefreshToken(tokenHash, { revoked_by_ip: metadata.ip }, dbClient);
      throw new AppError('Refresh token expirado', 401);
    }

    const user = await userModel.findById(tokenRecord.user_id, dbClient);
    if (!user || !user.is_active) {
      throw new AppError('Usuario invalido ou inativo', 401);
    }

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
      throw new AppError('Refresh token invalido', 401);
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

async function logout(rawRefreshToken, metadata = {}) {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  await userModel.revokeRefreshToken(tokenHash, { revoked_by_ip: metadata.ip });
}

async function logoutAll(userId, ip) {
  await userModel.revokeAllRefreshTokensForUser(userId, ip);
}

async function verifyEmail(rawToken) {
  const tokenHash = hashToken(rawToken || '');
  const token = await userModel.findEmailVerificationToken(tokenHash);

  if (!token || token.used_at || new Date(token.expires_at) <= new Date()) {
    throw new AppError('Token de verificacao invalido ou expirado', 400);
  }

  await userModel.consumeEmailVerificationToken(tokenHash);
  await userModel.markEmailVerified(token.user_id);
}

async function forgotPassword(email) {
  const user = await userModel.findByEmail(email);
  if (!user || !user.is_active) {
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
    throw new AppError('Token de redefinicao invalido ou expirado', 400);
  }

  const password = await bcrypt.hash(newPassword, env.bcryptRounds);
  await userModel.update(token.user_id, { password });
  await userModel.consumePasswordResetToken(tokenHash);
  await userModel.revokeAllRefreshTokensForUser(token.user_id);
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
  buildCookieOptions,
};
