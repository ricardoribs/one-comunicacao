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

module.exports = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresInDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7),
  passwordResetExpiresMinutes: Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 60),
  emailVerificationExpiresHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || 24),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  loginLockThreshold: Number(process.env.LOGIN_LOCK_THRESHOLD || 10),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'one_refresh_token',
  uploadMaxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10),
  dbPoolMax: Number(process.env.DB_POOL_MAX || 20),
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
  uploadProvider: process.env.UPLOAD_PROVIDER || 'local',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'manual',
  asaasApiUrl: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
  asaasApiKey: process.env.ASAAS_API_KEY || '',
  emailProvider: process.env.EMAIL_PROVIDER || 'log',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@one.local',
  sentryDsn: process.env.SENTRY_DSN || '',
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT || nodeEnv,
  sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  appBaseUrl: process.env.APP_BASE_URL || '',
  geoLookupEnabled: process.env.GEO_LOOKUP_ENABLED !== 'false',
  geoLookupTimeoutMs: Number(process.env.GEO_LOOKUP_TIMEOUT_MS || 1200),
  geoLookupCacheTtlMs: Number(process.env.GEO_LOOKUP_CACHE_TTL_MS || 6 * 60 * 60 * 1000),
  geoLookupUrlTemplate:
    process.env.GEO_LOOKUP_URL_TEMPLATE
    || 'https://ipwho.is/{ip}?fields=success,country_code,country,region,city',
  corsOrigins,
  frontendDir: path.resolve(__dirname, '../../../frontend'),
  uploadsDir: path.resolve(__dirname, '../../uploads'),
};
