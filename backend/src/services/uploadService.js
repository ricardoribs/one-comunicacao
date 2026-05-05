const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const CircuitBreaker = require('../utils/circuitBreaker');
const malwareScanService = require('./malwareScanService');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const uploadBreaker = new CircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 30000,
  timeoutMessage: 'Servico de upload temporariamente indisponivel.',
});

function deleteLocalFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

async function validateFileSignature(file) {
  if (!file?.path) {
    throw new AppError('Arquivo nao enviado.', 400);
  }

  const { fileTypeFromFile } = await import('file-type');
  const detectedType = await fileTypeFromFile(file.path);

  if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
    deleteLocalFile(file.path);
    throw new AppError('Tipo de arquivo nao permitido.', 400);
  }

  return detectedType;
}

async function uploadFile(file) {
  if (!file) {
    throw new AppError('Arquivo nao enviado.', 400);
  }

  const detectedType = await validateFileSignature(file);
  await malwareScanService.scanUploadedFile(file);

  if (env.uploadProvider === 'cloudinary') {
    if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
      throw new AppError('Cloudinary nao configurado no ambiente.', 500);
    }

    const result = await uploadBreaker.run(() =>
      cloudinary.uploader.upload(file.path, {
        resource_type: 'auto',
        folder: 'one-comunicacao',
        type: 'private',
      })
    );

    deleteLocalFile(file.path);

    return {
      storedName: result.public_id,
      url: result.secure_url,
      signedUrl: null,
      mimeType: detectedType.mime,
      extension: detectedType.ext,
    };
  }

  return {
    storedName: file.filename,
    url: `/uploads/${file.filename}`,
    signedUrl: `/uploads/${path.basename(file.filename)}`,
    mimeType: detectedType.mime,
    extension: detectedType.ext,
  };
}

async function deleteUploadedFile(file) {
  if (!file) {
    return;
  }

  if (env.uploadProvider === 'cloudinary') {
    if (file.stored_name) {
      await uploadBreaker
        .run(() => cloudinary.uploader.destroy(file.stored_name, { resource_type: 'image', type: 'private', invalidate: true }))
        .catch(() => null);
      await uploadBreaker
        .run(() => cloudinary.uploader.destroy(file.stored_name, { resource_type: 'raw', type: 'private', invalidate: true }))
        .catch(() => null);
      await uploadBreaker
        .run(() => cloudinary.uploader.destroy(file.stored_name, { resource_type: 'video', type: 'private', invalidate: true }))
        .catch(() => null);
    }
    return;
  }

  if (file.stored_name && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

function inferCloudinaryResourceType(mimeType = '') {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return 'raw';
}

function inferFileFormat(file = {}) {
  const extension = path.extname(file.original_name || file.originalName || '').replace('.', '').toLowerCase();
  if (extension) {
    return extension;
  }

  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };

  return mimeMap[file.mime_type] || null;
}

async function resolveFileAccessUrl(file) {
  if (!file) {
    throw new AppError('Arquivo nao encontrado.', 404);
  }

  if (env.uploadProvider === 'cloudinary') {
    const format = inferFileFormat(file);

    if (!format) {
      throw new AppError('Nao foi possivel gerar a URL protegida deste arquivo.', 500);
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 300;

    return uploadBreaker.run(() =>
      cloudinary.utils.private_download_url(file.stored_name, format, {
        resource_type: inferCloudinaryResourceType(file.mime_type),
        type: 'private',
        secure: true,
        expires_at: expiresAt,
        attachment: file.original_name || true,
      })
    );
  }

  return `/uploads/${path.basename(file.stored_name)}`;
}

module.exports = {
  uploadFile,
  deleteUploadedFile,
  resolveFileAccessUrl,
  getHealth() {
    const configured =
      env.uploadProvider === 'local' ||
      (env.uploadProvider === 'cloudinary' &&
        Boolean(env.cloudinaryCloudName) &&
        Boolean(env.cloudinaryApiKey) &&
        Boolean(env.cloudinaryApiSecret));
    const breaker = uploadBreaker.getState();
    const malware = malwareScanService.getHealth();
    const privateDeliveryEnforced = env.uploadProvider !== 'cloudinary' || env.cloudinaryRequirePrivateUpload;
    const status =
      configured && !breaker.open && malware.status === 'up' && privateDeliveryEnforced
        ? 'up'
        : configured && !breaker.open
          ? 'degraded'
          : 'degraded';

    return {
      provider: env.uploadProvider,
      configured,
      privateDeliveryEnforced,
      malware,
      breaker,
      status,
    };
  },
};
