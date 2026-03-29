const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const hpp = require('hpp');
const compression = require('compression');
const env = require('./config/env');
const logger = require('./config/logger');
const sentry = require('./config/sentry');
const healthService = require('./services/healthService');
const errorMiddleware = require('./middlewares/errorMiddleware');
const requestContextMiddleware = require('./middlewares/requestContextMiddleware');
const sanitizeMiddleware = require('./middlewares/sanitizeMiddleware');
const contentTypeMiddleware = require('./middlewares/contentTypeMiddleware');
const asyncHandler = require('./utils/asyncHandler');
const { authenticate, authorize } = require('./middlewares/authMiddleware');
const fileModel = require('./models/fileModel');
const materialModel = require('./models/materialModel');
const reportModel = require('./models/reportModel');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clientRoutes = require('./routes/clientRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const taskRoutes = require('./routes/taskRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const materialRoutes = require('./routes/materialRoutes');
const metricRoutes = require('./routes/metricRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const contactRoutes = require('./routes/contactRoutes');
const chargeRoutes = require('./routes/chargeRoutes');
const accountRoutes = require('./routes/accountRoutes');
const addressRoutes = require('./routes/addressRoutes');
const checklistRoutes = require('./routes/checklistRoutes');

const app = express();
const htmlCache = new Map();
const assetVersionCache = new Map();

sentry.initSentry();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

if (env.isProduction && (!env.jwtSecret || env.jwtSecret === 'change-me' || env.jwtSecret.length < 64)) {
  throw new Error('JWT_SECRET inválido para produção.');
}

if (env.isProduction && env.corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS deve ser definido em produção.');
}

if (env.isProduction && env.emailProvider === 'log') {
  throw new Error('EMAIL_PROVIDER não pode permanecer em modo log em produção.');
}

if (env.isProduction && env.emailProvider === 'resend' && !env.resendApiKey) {
  throw new Error('RESEND_API_KEY deve ser definido em produção quando EMAIL_PROVIDER=resend.');
}

if (env.isProduction && env.uploadProvider === 'local') {
  throw new Error('UPLOAD_PROVIDER=local não é permitido em produção.');
}

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de requisições excedido. Tente novamente em instantes.' },
});

app.use(requestContextMiddleware);
app.use(sentry.requestHandler());
app.use(
  pinoHttp({
    logger,
    customProps(req) {
      return {
        request_id: req.requestId,
        user_id: req.user?.id || null,
      };
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        };
      },
    },
  })
);

app.use((req, res, next) => {
  if (env.isProduction && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `${env.appBaseUrl || `https://${req.headers.host}`}${req.originalUrl}`);
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origem não permitida por CORS.'));
    },
    credentials: true,
  })
);
app.use(
  helmet({
    hsts: env.isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
        'script-src-elem': ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, 'https://fonts.googleapis.com'],
        'style-src-elem': ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, 'https://fonts.googleapis.com'],
        'style-src-attr': ["'unsafe-inline'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'connect-src': ["'self'", 'https://viacep.com.br'],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': env.isProduction ? [] : null,
      },
    },
  })
);
app.use(globalLimiter);
app.use(hpp());
app.use(compression());
app.use(cookieParser());
app.use(contentTypeMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeMiddleware);

function loadHtmlTemplate(fileName) {
  const filePath = path.join(env.frontendDir, fileName);

  if (env.isProduction && htmlCache.has(filePath)) {
    return htmlCache.get(filePath);
  }

  const html = fs.readFileSync(filePath, 'utf8');

  if (env.isProduction) {
    htmlCache.set(filePath, html);
  }

  return html;
}

function injectNonce(html, nonce) {
  return html
    .replace(/<style(\s[^>]*)?>/g, (_match, attrs = '') => `<style${attrs} nonce="${nonce}">`)
    .replace(/<script(?![^>]*\bsrc=)(\s[^>]*)?>/g, (_match, attrs = '') => `<script${attrs} nonce="${nonce}">`);
}

function getAssetVersion(assetPath) {
  const normalizedPath = assetPath.split('?')[0];
  if (assetVersionCache.has(normalizedPath)) {
    return assetVersionCache.get(normalizedPath);
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  const absolutePath = path.join(env.frontendDir, relativePath);

  try {
    const { mtimeMs } = fs.statSync(absolutePath);
    const version = String(Math.floor(mtimeMs));
    assetVersionCache.set(normalizedPath, version);
    return version;
  } catch (_error) {
    return null;
  }
}

function injectAssetVersions(html) {
  return html.replace(/((?:src|href)=["'])(\/?assets\/[^"'?#>]+)(\?[^"'>]*)?(["'])/g, (_match, prefix, assetPath, query = '', suffix) => {
    const version = getAssetVersion(assetPath);
    if (!version) {
      return `${prefix}${assetPath}${query}${suffix}`;
    }

    const separator = query ? '&' : '?';
    return `${prefix}${assetPath}${query}${separator}v=${version}${suffix}`;
  });
}

function sendHtmlPage(res, fileName, status = 200) {
  res.status(status);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html');
  res.send(injectAssetVersions(injectNonce(loadHtmlTemplate(fileName), res.locals.cspNonce)));
}

app.use((req, res, next) => {
  const isOperationalRoute =
    req.path.startsWith('/health') ||
    req.path.startsWith('/api/health') ||
    req.path.startsWith('/ready') ||
    req.path.startsWith('/api/ready');

  if (env.maintenanceMode && !isOperationalRoute) {
    sendHtmlPage(res, 'maintenance.html', 503);
    return;
  }
  next();
});

app.use('/assets', express.static(path.join(env.frontendDir, 'assets'), { maxAge: env.isProduction ? '7d' : 0 }));

async function resolveLocalUploadAccess(fileName, user) {
  const relativePath = `/uploads/${fileName}`;

  return (
    (await fileModel.findByStoredName(fileName, user)) ||
    (await materialModel.findByFilePath(relativePath, user)) ||
    (await materialModel.findByFilePath(fileName, user)) ||
    (await reportModel.findByFilePath(relativePath, user))
  );
}

app.get(
  '/uploads/:fileName',
  authenticate,
  asyncHandler(async (req, res) => {
    const safeName = path.basename(req.params.fileName || '');
    if (!safeName || safeName !== req.params.fileName) {
      return res.status(404).json({ message: 'Arquivo nao encontrado.', request_id: req.requestId });
    }

    const filePath = path.resolve(env.uploadsDir, safeName);
    const uploadsRoot = path.resolve(env.uploadsDir);
    if (!(filePath === path.join(uploadsRoot, safeName) && filePath.startsWith(uploadsRoot))) {
      return res.status(404).json({ message: 'Arquivo nao encontrado.', request_id: req.requestId });
    }

    const allowedAsset = await resolveLocalUploadAccess(safeName, req.user);
    if (!allowedAsset || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo nao encontrado.', request_id: req.requestId });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(filePath);
  })
);

async function publicHealthHandler(req, res) {
  const health = await healthService.getPublicHealth();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
}

async function internalHealthHandler(req, res) {
  const health = await healthService.getInternalHealth();
  res.status(health.status === 'down' ? 503 : 200).json(health);
}

app.get('/health', publicHealthHandler);
app.get('/api/health', publicHealthHandler);
app.get('/ready', publicHealthHandler);
app.get('/api/ready', publicHealthHandler);
app.get('/api/health/internal', authenticate, authorize('admin'), internalHealthHandler);
app.get('/api/ready/internal', authenticate, authorize('admin'), internalHealthHandler);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/checklists', checklistRoutes);

app.get('/painel-interno.html', (req, res) => {
  sendHtmlPage(res, 'painel-interno.html');
});

app.get('/politica-de-privacidade.html', (req, res) => {
  sendHtmlPage(res, 'politica-de-privacidade.html');
});

app.get('/termos-de-uso.html', (req, res) => {
  sendHtmlPage(res, 'termos-de-uso.html');
});

app.get('/reset-password', (req, res) => {
  sendHtmlPage(res, 'reset-password.html');
});

app.get('/index.html', (req, res) => {
  sendHtmlPage(res, 'index.html');
});

app.get('/', (req, res) => {
  sendHtmlPage(res, 'index.html');
});

app.use('/api', (req, res) => {
  res.status(404).json({
    message: 'Endpoint não encontrado',
    request_id: req.requestId,
  });
});

app.use((req, res) => {
  sendHtmlPage(res, '404.html', 404);
});

app.use(sentry.errorHandler());
app.use(errorMiddleware);

module.exports = app;
