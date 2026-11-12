const crypto = require('crypto');
const AppError = require('./AppError');

const PREFIX = 'enc:v1';

function deriveKey(secret, label) {
  if (!secret) {
    throw new AppError(`${label} nao configurada.`, 500);
  }

  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptString(value, secret, label = 'Chave de criptografia') {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const text = String(value);
  if (text.startsWith(`${PREFIX}:`)) {
    return text;
  }

  const key = deriveKey(secret, label);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptString(value, secret, label = 'Chave de criptografia') {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const text = String(value);
  if (!text.startsWith(`${PREFIX}:`)) {
    return text;
  }

  const [, version, ivBase64, authTagBase64, encryptedBase64] = text.split(':');
  if (version !== 'v1' || !ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new AppError('Valor criptografado em formato invalido.', 500);
  }

  const key = deriveKey(secret, label);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  encryptString,
  decryptString,
};
