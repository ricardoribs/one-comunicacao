#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function error(message) {
  log(`ERROR ${message}`, RED);
}

function success(message) {
  log(`OK ${message}`, GREEN);
}

function warning(message) {
  log(`WARN ${message}`, YELLOW);
}

function getCliOption(name) {
  const args = process.argv.slice(2);
  const prefix = `${name}=`;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === name) {
      return args[index + 1] || '';
    }
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return '';
}

function hasCliFlag(name) {
  return process.argv.slice(2).includes(name);
}

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    return process.env;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const fileEnv = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const [key, ...valueParts] = trimmed.split('=');
    fileEnv[key.trim()] = valueParts
      .join('=')
      .trim()
      .replace(/^["']|["']$/g, '');
  });

  return { ...fileEnv, ...process.env };
}

const env = loadEnv();
const targetEnvironment = getCliOption('--target') || env.VALIDATE_ENV_TARGET || env.NODE_ENV || 'development';
const isProductionTarget = targetEnvironment === 'production';
const requireSmokeCredentials =
  hasCliFlag('--require-smoke') ||
  ['1', 'true', 'yes', 'on'].includes(
    String(env.REQUIRE_SMOKE_CREDENTIALS || '')
      .trim()
      .toLowerCase()
  );
const requireRlsVerification =
  hasCliFlag('--require-rls') ||
  ['1', 'true', 'yes', 'on'].includes(
    String(env.REQUIRE_RLS_VERIFICATION || '')
      .trim()
      .toLowerCase()
  );
const errors = [];
const warnings = [];

log(`\n${BOLD}=== Validacao de Variaveis de Ambiente ===${RESET}\n`);
log(`Alvo: ${isProductionTarget ? 'PRODUCTION' : targetEnvironment}`);
log(`NODE_ENV atual: ${env.NODE_ENV || 'nao configurado'}\n`);

function pushError(message) {
  errors.push(message);
  error(message);
}

function pushWarning(message) {
  warnings.push(message);
  warning(message);
}

function hasValue(name) {
  return Boolean(String(env[name] || '').trim());
}

function validateVar(name, description, level = 'critical') {
  if (hasValue(name)) {
    success(`${name} configurado`);
    return env[name];
  }

  const message = `${name}: ${description}`;
  if (isProductionTarget && level === 'critical') {
    pushError(message);
    return false;
  }

  pushWarning(`${message} (nao configurado para ${targetEnvironment})`);
  return false;
}

function validateLength(name, minLength, value) {
  if (value && String(value).length < minLength) {
    pushError(`${name} muito curto; minimo ${minLength} caracteres`);
    return false;
  }
  return true;
}

function validateDatabaseConfig() {
  if (hasValue('DATABASE_URL')) {
    success('DATABASE_URL configurado');
    return;
  }

  const requiredParts = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
  const missingParts = requiredParts.filter((name) => !hasValue(name));
  if (missingParts.length > 0) {
    const message = `Banco incompleto: defina DATABASE_URL ou ${requiredParts.join(', ')}; faltam ${missingParts.join(', ')}`;
    if (isProductionTarget) {
      pushError(message);
    } else {
      pushWarning(`${message} (nao configurado para ${targetEnvironment})`);
    }
    return;
  }

  success('Banco configurado por host/nome/usuario/senha');
}

const CRITICAL_VARS = {
  NODE_ENV: 'Ambiente de execucao',
  JWT_SECRET: 'Secret para assinatura de JWT; minimo 64 caracteres',
  CORS_ORIGINS: 'Origins permitidas para CORS',
  TRUST_PROXY: 'Configuracao de proxy reverso',
  APP_BASE_URL: 'URL base da aplicacao',
  EMAIL_PROVIDER: 'Provider de email; em producao use resend',
};

const HIGH_PRIORITY_VARS = {
  DATABASE_SSL_REQUIRED: 'Requer SSL na conexao do banco',
  BCRYPT_ROUNDS: 'Rounds do bcrypt',
  MFA_ENCRYPTION_KEY: 'Chave de criptografia para secrets MFA; minimo 32 caracteres',
  FINANCIAL_ENCRYPTION_KEY: 'Chave de criptografia para campos financeiros; minimo 32 caracteres',
  UPLOAD_PROVIDER: 'Provider de upload; em producao use cloudinary',
};

const RECOMMENDED_VARS = {
  SENTRY_DSN: 'DSN do Sentry',
  SENTRY_REQUIRED: 'Sentry obrigatorio em producao',
  CLOUDINARY_CLOUD_NAME: 'Cloud name do Cloudinary',
  CLOUDINARY_API_KEY: 'API key do Cloudinary',
  CLOUDINARY_API_SECRET: 'API secret do Cloudinary',
  CLOUDINARY_REQUIRE_PRIVATE_UPLOAD: 'Uploads privados no Cloudinary',
  RESEND_API_KEY: 'API key do Resend',
  UPLOAD_REQUIRE_MALWARE_SCAN: 'Scan de malware em uploads; opcional enquanto a mitigacao bloqueia tipos arriscados',
};

if (isProductionTarget && env.NODE_ENV !== 'production') {
  pushError('NODE_ENV deve ser production quando --target=production');
}

log(`${BOLD}CRITICAS${RESET}`);
Object.entries(CRITICAL_VARS).forEach(([name, description]) => validateVar(name, description, 'critical'));
validateDatabaseConfig();

if (isProductionTarget && requireRlsVerification) {
  validateVar('VERIFY_DATABASE_URL', 'URL direta do banco para executar verify:rls no gate de deploy', 'critical');
} else if (isProductionTarget && !hasValue('VERIFY_DATABASE_URL')) {
  pushWarning(
    'VERIFY_DATABASE_URL ausente; execute verify:rls no CI ou manualmente de um ambiente com acesso direto ao banco'
  );
}

const jwtSecret = env.JWT_SECRET;
if (jwtSecret && isProductionTarget) {
  validateLength('JWT_SECRET', 64, jwtSecret);
  if (jwtSecret === 'change-me') {
    pushError('JWT_SECRET nao pode ser change-me em producao');
  }
}

if (env.DATABASE_SSL_REQUIRED === 'true' && isProductionTarget) {
  if (!hasValue('DATABASE_SSL_CA_FILE') && !hasValue('DATABASE_SSL_CA_PEM')) {
    pushError('DATABASE_SSL_REQUIRED=true exige DATABASE_SSL_CA_FILE ou DATABASE_SSL_CA_PEM');
  } else {
    success('CA de SSL do banco configurada');
  }
}

if (env.UPLOAD_PROVIDER === 'local' && isProductionTarget) {
  pushError('UPLOAD_PROVIDER=local nao e permitido em producao');
}

if (env.EMAIL_PROVIDER === 'log' && isProductionTarget) {
  pushError('EMAIL_PROVIDER=log nao e permitido em producao');
}

if (env.EMAIL_PROVIDER === 'resend' && !hasValue('RESEND_API_KEY') && isProductionTarget) {
  pushError('RESEND_API_KEY obrigatorio quando EMAIL_PROVIDER=resend');
}

if (env.UPLOAD_PROVIDER === 'cloudinary' && isProductionTarget) {
  const missingCloudinary = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
    (name) => !hasValue(name)
  );
  if (missingCloudinary.length > 0) {
    pushError(`Credenciais do Cloudinary incompletas: ${missingCloudinary.join(', ')}`);
  }
}

const effectiveMfaRequiredRoles = env.MFA_REQUIRED_ROLES ?? 'admin,gestor,comercial';
if (effectiveMfaRequiredRoles !== '' && !hasValue('MFA_ENCRYPTION_KEY') && isProductionTarget) {
  pushError('MFA_ENCRYPTION_KEY obrigatorio quando MFA_REQUIRED_ROLES esta configurado');
}

if (hasValue('MFA_ENCRYPTION_KEY') && isProductionTarget) {
  validateLength('MFA_ENCRYPTION_KEY', 32, env.MFA_ENCRYPTION_KEY);
}

if (hasValue('FINANCIAL_ENCRYPTION_KEY') && isProductionTarget) {
  validateLength('FINANCIAL_ENCRYPTION_KEY', 32, env.FINANCIAL_ENCRYPTION_KEY);
}

if (isProductionTarget && !hasValue('FINANCIAL_ENCRYPTION_KEY')) {
  pushError('FINANCIAL_ENCRYPTION_KEY obrigatorio em producao');
}

const googleCalendarConfigured = hasValue('GOOGLE_CLIENT_ID') || hasValue('GOOGLE_CLIENT_SECRET');
if (isProductionTarget && googleCalendarConfigured) {
  const missingGoogleConfig = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'].filter(
    (name) => !hasValue(name)
  );
  if (missingGoogleConfig.length > 0) {
    pushError(`Google Calendar incompleto: ${missingGoogleConfig.join(', ')}`);
  }

  if (!hasValue('GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY')) {
    pushError('GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY obrigatorio quando Google Calendar esta configurado');
  }
}

if (hasValue('GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY') && isProductionTarget) {
  validateLength('GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY', 32, env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY);
}

if (isProductionTarget && env.UPLOAD_REQUIRE_MALWARE_SCAN !== 'true') {
  pushWarning(
    'UPLOAD_REQUIRE_MALWARE_SCAN=false em producao; ClamAV fica em backlog e tipos arriscados seguem bloqueados por mitigacao'
  );
}

if (isProductionTarget && env.UPLOAD_REQUIRE_MALWARE_SCAN === 'true' && !hasValue('CLAMAV_HOST')) {
  pushError('CLAMAV_HOST obrigatorio quando UPLOAD_REQUIRE_MALWARE_SCAN=true');
}

if (isProductionTarget && env.SENTRY_REQUIRED === 'true' && !hasValue('SENTRY_DSN')) {
  pushError('SENTRY_DSN obrigatorio quando SENTRY_REQUIRED=true');
}

if (isProductionTarget && env.SENTRY_ENVIRONMENT !== 'production') {
  pushError('SENTRY_ENVIRONMENT deve ser production em producao');
}

if (isProductionTarget && !hasValue('SECURITY_ALERT_WEBHOOK_URL')) {
  pushWarning('SECURITY_ALERT_WEBHOOK_URL ausente; webhook real fica em backlog e alertas seguem em log estruturado');
}

if (isProductionTarget && requireSmokeCredentials && (!hasValue('SMOKE_EMAIL') || !hasValue('SMOKE_PASSWORD'))) {
  pushError('SMOKE_EMAIL e SMOKE_PASSWORD obrigatorios porque o gate de deploy executa npm run smoke');
} else if (isProductionTarget && (!hasValue('SMOKE_EMAIL') || !hasValue('SMOKE_PASSWORD'))) {
  pushWarning(
    'SMOKE_EMAIL e SMOKE_PASSWORD ausentes; execute o smoke autenticado no CI ou no pos-deploy quando houver credenciais de teste'
  );
}

log(`\n${BOLD}ALTA PRIORIDADE${RESET}`);
Object.entries(HIGH_PRIORITY_VARS).forEach(([name, description]) => validateVar(name, description, 'high'));

log(`\n${BOLD}RECOMENDADAS${RESET}`);
Object.entries(RECOMMENDED_VARS).forEach(([name, description]) => validateVar(name, description, 'recommended'));

log(`\n${BOLD}=== Resumo ===${RESET}\n`);

if (errors.length > 0) {
  log(`${RED}${BOLD}${errors.length} erro(s) encontrado(s). DEPLOY BLOQUEADO.${RESET}`);
  errors.forEach((item) => error(item));
  process.exit(1);
}

if (warnings.length > 0) {
  log(`${YELLOW}${BOLD}${warnings.length} aviso(s) encontrado(s).${RESET}`);
  warnings.forEach((item) => warning(item));
  if (!isProductionTarget) {
    log(`\n${YELLOW}Validacao local concluida. Este resultado nao libera deploy de producao.${RESET}\n`);
    process.exit(0);
  }
}

if (isProductionTarget) {
  log(`\n${GREEN}${BOLD}PRONTO PARA DEPLOY EM PRODUCAO.${RESET}\n`);
} else {
  log(`\n${GREEN}${BOLD}VALIDACAO LOCAL CONCLUIDA. Use --target=production para liberar producao.${RESET}\n`);
}

process.exit(0);
