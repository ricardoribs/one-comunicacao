const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { generateSecret, generateSync, verifySync, generateURI } = require('otplib');
const QRCode = require('qrcode');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const REQUIRED_ROLE_SET = new Set(env.mfaRequiredRoles);
const CHALLENGE_TOKEN_USE = 'mfa_challenge';

function normalizeOtp(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function requiresMfa(userOrRole) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return REQUIRED_ROLE_SET.has(role);
}

function isMfaEnabled(user = {}) {
  return Boolean(user.mfa_totp_secret_encrypted && user.mfa_enabled_at);
}

function shouldChallengeForMfa(user = {}) {
  return requiresMfa(user) || isMfaEnabled(user);
}

function ensureEncryptionKeyAvailable() {
  if (!env.mfaEncryptionKey) {
    throw new AppError('MFA nao configurado no ambiente.', 500);
  }

  return crypto.createHash('sha256').update(env.mfaEncryptionKey).digest();
}

function encryptSecret(secret) {
  const key = ensureEncryptionKeyAvailable();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptSecret(payload) {
  if (!payload) {
    return '';
  }

  const [ivBase64, authTagBase64, encryptedBase64] = String(payload).split('.');
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new AppError('Segredo MFA armazenado em formato invalido.', 500);
  }

  const key = ensureEncryptionKeyAvailable();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function createChallengeToken(user, purpose = 'login') {
  return jwt.sign(
    {
      userId: user.id,
      token_use: CHALLENGE_TOKEN_USE,
      purpose,
    },
    env.jwtSecret,
    {
      algorithm: env.jwtAlgorithm,
      expiresIn: `${env.mfaChallengeExpiresMinutes}m`,
    }
  );
}

function verifyChallengeToken(token, expectedPurpose = null) {
  if (!token) {
    throw new AppError('Challenge MFA nao informado.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, {
      algorithms: [env.jwtAlgorithm],
    });
  } catch {
    throw new AppError('Challenge MFA invalido ou expirado.', 401);
  }

  if (payload?.token_use !== CHALLENGE_TOKEN_USE) {
    throw new AppError('Challenge MFA invalido.', 401);
  }

  if (expectedPurpose && payload?.purpose !== expectedPurpose) {
    throw new AppError('Challenge MFA invalido para esta operacao.', 401);
  }

  return payload;
}

function buildEnrollmentSecret(user) {
  const secret = generateSecret();
  return {
    secret,
    otpauthUrl: generateURI({
      issuer: env.mfaIssuer,
      label: user.email,
      secret,
    }),
  };
}

function formatSecret(secret) {
  return String(secret || '')
    .replace(/\s+/g, '')
    .match(/.{1,4}/g)
    ?.join(' ')
    || '';
}

function verifyOtp(secret, otp) {
  return Boolean(
    verifySync({
      token: normalizeOtp(otp),
      secret,
      window: 1,
    })?.valid
  );
}

function generateCurrentOtp(secret) {
  return generateSync({ secret });
}

function buildOtpUri(user, secret) {
  return generateURI({
    issuer: env.mfaIssuer,
    label: user.email,
    secret,
  });
}

async function buildEnrollmentResponse(user, secret) {
  const otpauthUrl = buildOtpUri(user, secret);
  let qrCodeDataUrl = null;

  try {
    qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
    });
  } catch (_error) {
    qrCodeDataUrl = null;
  }

  return {
    secret,
    secret_formatted: formatSecret(secret),
    otpauth_url: otpauthUrl,
    qr_code_data_url: qrCodeDataUrl,
    issuer: env.mfaIssuer,
    account_name: user.email,
  };
}

module.exports = {
  requiresMfa,
  isMfaEnabled,
  shouldChallengeForMfa,
  encryptSecret,
  decryptSecret,
  createChallengeToken,
  verifyChallengeToken,
  buildEnrollmentSecret,
  buildEnrollmentResponse,
  verifyOtp,
  generateCurrentOtp,
  formatSecret,
};
