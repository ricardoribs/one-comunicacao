const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultEnvPath = path.resolve(__dirname, '../../../.env');
const explicitEnvPath = process.env.ENV_FILE ? path.resolve(process.cwd(), process.env.ENV_FILE) : defaultEnvPath;

if (nodeEnv !== 'production' && fs.existsSync(explicitEnvPath)) {
  dotenv.config({ path: explicitEnvPath });
}

const isProduction = nodeEnv === 'production';
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

function parseCsvEnv(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return String(value).trim().toLowerCase() === 'true';
}

function parseTrustProxy(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const normalized = String(value).trim();

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  if (normalized.toLowerCase() === 'true') {
    return true;
  }

  if (normalized.toLowerCase() === 'false') {
    return false;
  }

  if (normalized.includes(',')) {
    return parseCsvEnv(normalized);
  }

  return normalized;
}

const requestedDbPoolMax = Number(process.env.DB_POOL_MAX || (isProduction ? 8 : 20));
const dbPoolMax = Number.isFinite(requestedDbPoolMax)
  ? Math.max(1, isProduction ? Math.min(requestedDbPoolMax, 8) : requestedDbPoolMax)
  : (isProduction ? 8 : 20);
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY || (isProduction ? '' : '1'));
const defaultTestMfaEncryptionKey = nodeEnv === 'test' ? 'test-only-mfa-encryption-key' : '';
const defaultTestFinancialEncryptionKey = nodeEnv === 'test' ? 'test-only-financial-encryption-key' : '';
const defaultMfaRequiredRoles = nodeEnv === 'development' ? '' : 'admin,gestor,comercial';
const appBaseUrl = process.env.APP_BASE_URL || '';
const defaultRobotsNoindex = /(?:^|[.-])staging(?:[.-]|$)|\.onrender\.com/i.test(appBaseUrl);

module.exports = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresInDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7),
  passwordResetExpiresMinutes: Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 60),
  emailVerificationExpiresHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || 24),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  loginLockThreshold: Number(process.env.LOGIN_LOCK_THRESHOLD || 10),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'one_refresh_token',
  uploadMaxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10),
  dbPoolMax,
  dbConnectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
  dbIdleTimeoutMs: Number(process.env.DB_IDLE_TIMEOUT_MS || 10000),
  dbQueryTimeoutMs: Number(process.env.DB_QUERY_TIMEOUT_MS || 10000),
  dbStatementTimeoutMs: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 10000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/one_comunicacao',
  databaseHost: process.env.DATABASE_HOST || '',
  databasePort: Number(process.env.DATABASE_PORT || 5432),
  databaseName: process.env.DATABASE_NAME || '',
  databaseUser: process.env.DATABASE_USER || '',
  databasePassword: process.env.DATABASE_PASSWORD || '',
  databaseSslCaFile: process.env.DATABASE_SSL_CA_FILE || '',
  databaseSslCaPem: process.env.DATABASE_SSL_CA_PEM || '',
  databaseSslRequired: parseBooleanEnv(process.env.DATABASE_SSL_REQUIRED, isProduction),
  uploadProvider: process.env.UPLOAD_PROVIDER || 'local',
  uploadRequireMalwareScan: parseBooleanEnv(process.env.UPLOAD_REQUIRE_MALWARE_SCAN, false),
  malwareScanProvider: process.env.MALWARE_SCAN_PROVIDER || 'none',
  clamavHost: process.env.CLAMAV_HOST || '',
  clamavPort: Number(process.env.CLAMAV_PORT || 3310),
  clamavTimeoutMs: Number(process.env.CLAMAV_TIMEOUT_MS || 10000),
  paymentProvider: process.env.PAYMENT_PROVIDER || 'manual',
  asaasApiUrl: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
  asaasApiKey: process.env.ASAAS_API_KEY || '',
  emailProvider: process.env.EMAIL_PROVIDER || 'log',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@one.local',
  sentryDsn: process.env.SENTRY_DSN || '',
  sentryRequired: parseBooleanEnv(process.env.SENTRY_REQUIRED, isProduction),
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT || nodeEnv,
  sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryRequirePrivateUpload: parseBooleanEnv(process.env.CLOUDINARY_REQUIRE_PRIVATE_UPLOAD, isProduction),
  appBaseUrl,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || `${appBaseUrl || 'http://localhost:3000'}/api/calendar-integrations/google/callback`,
  googleCalendarSyncIntervalMs: Number(process.env.GOOGLE_CALENDAR_SYNC_INTERVAL_MS || 30 * 60 * 1000),
  robotsNoindex: parseBooleanEnv(process.env.ROBOTS_NOINDEX, defaultRobotsNoindex),
  geoLookupEnabled: process.env.GEO_LOOKUP_ENABLED !== 'false',
  geoLookupTimeoutMs: Number(process.env.GEO_LOOKUP_TIMEOUT_MS || 1200),
  geoLookupCacheTtlMs: Number(process.env.GEO_LOOKUP_CACHE_TTL_MS || 6 * 60 * 60 * 1000),
  geoLookupUrlTemplate:
    process.env.GEO_LOOKUP_URL_TEMPLATE
    || 'https://ipwho.is/{ip}?fields=success,country_code,country,region,city',
  mfaRequiredRoles: parseCsvEnv(process.env.MFA_REQUIRED_ROLES ?? defaultMfaRequiredRoles),
  mfaEncryptionKey: process.env.MFA_ENCRYPTION_KEY || defaultTestMfaEncryptionKey,
  financialEncryptionKey: process.env.FINANCIAL_ENCRYPTION_KEY || defaultTestFinancialEncryptionKey,
  mfaChallengeExpiresMinutes: Number(process.env.MFA_CHALLENGE_EXPIRES_MINUTES || 5),
  mfaIssuer: process.env.MFA_ISSUER || 'ONE Comunicacao',
  securityAlertWebhookUrl: process.env.SECURITY_ALERT_WEBHOOK_URL || '',
  securityAlertTimeoutMs: Number(process.env.SECURITY_ALERT_TIMEOUT_MS || 5000),
  trustProxy,
  trustProxyConfigured: process.env.TRUST_PROXY !== undefined,
  corsOrigins,
  frontendDir: path.resolve(__dirname, '../../../frontend'),
  uploadsDir: path.resolve(__dirname, '../../uploads'),
};
