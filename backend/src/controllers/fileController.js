const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const asyncHandler = require('../utils/asyncHandler');
const fileModel = require('../models/fileModel');
const { ensureClientAccess } = require('../utils/access');
const uploadService = require('../services/uploadService');
const AppError = require('../utils/AppError');
const { buildLegacyFileAccessUrl, decorateFileCollection, decorateFileRecord } = require('../utils/fileAccess');
const { sendPaginated } = require('../utils/response');

function isInlineMimeType(mimeType = '') {
  return mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType === 'application/pdf';
}

function sanitizeFileName(fileName = 'arquivo') {
  return String(fileName).replace(/[\r\n"]/g, '_');
}

function setFileResponseHeaders(res, file, contentType, contentLength) {
  const originalName = sanitizeFileName(file.original_name || 'arquivo');
  const dispositionType = isInlineMimeType(contentType) ? 'inline' : 'attachment';

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${dispositionType}; filename="${originalName}"; filename*=UTF-8''${encodeURIComponent(file.original_name || originalName)}`
  );

  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > 0) {
    res.setHeader('Content-Length', String(contentLength));
  }
}

async function streamLocalFile(res, file) {
  const safeName = path.basename(file.stored_name || '');
  if (!safeName || safeName !== file.stored_name) {
    throw new AppError('Arquivo nao encontrado.', 404);
  }

  const uploadsRoot = path.resolve(__dirname, '../../uploads');
  const filePath = path.resolve(uploadsRoot, safeName);

  if (!(filePath === path.join(uploadsRoot, safeName) && filePath.startsWith(uploadsRoot)) || !fs.existsSync(filePath)) {
    throw new AppError('Arquivo nao encontrado.', 404);
  }

  const stats = fs.statSync(filePath);
  setFileResponseHeaders(res, file, file.mime_type || 'application/octet-stream', stats.size);
  await pipeline(fs.createReadStream(filePath), res);
}

async function streamRemoteFile(res, file) {
  const signedUrl = await uploadService.resolveFileAccessUrl(file);
  const response = await fetch(signedUrl, {
    method: 'GET',
  });

  if (!response.ok || !response.body) {
    throw new AppError('Nao foi possivel abrir o arquivo solicitado.', 502);
  }

  setFileResponseHeaders(
    res,
    file,
    response.headers.get('content-type') || file.mime_type || 'application/octet-stream',
    response.headers.get('content-length')
  );

  await pipeline(Readable.fromWeb(response.body), res);
}

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, decorateFileCollection(await fileModel.list(req.user, req.query)));
});

exports.upload = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }

  const uploaded = await uploadService.uploadFile(req.file);
  const file = await fileModel.create(
    {
      client_id: req.body.client_id || null,
      uploaded_by: req.user.id,
      original_name: req.file.originalname,
      stored_name: uploaded.storedName,
      mime_type: uploaded.mimeType || req.file.mimetype,
      size: req.file.size,
      url: uploaded.url,
    },
    req.user
  );

  res.status(201).json(decorateFileRecord(file));
});

exports.getAccessUrl = asyncHandler(async (req, res) => {
  const file = await fileModel.findById(req.params.id, req.user);
  if (!file) {
    return res.status(404).json({ message: 'Arquivo nao encontrado.' });
  }

  res.json({
    url: buildLegacyFileAccessUrl(file.id, req.user.id),
  });
});

exports.streamContent = asyncHandler(async (req, res) => {
  const file = await fileModel.findById(req.params.id, req.user);
  if (!file) {
    return res.status(404).json({ message: 'Arquivo nao encontrado.' });
  }

  if (String(file.url || '').startsWith('/uploads/')) {
    await streamLocalFile(res, file);
    return;
  }

  await streamRemoteFile(res, file);
});

exports.remove = asyncHandler(async (req, res) => {
  const file = await fileModel.findById(req.params.id, req.user);
  if (!file) {
    return res.status(404).json({ message: 'Arquivo nao encontrado.' });
  }

  file.path = path.resolve(__dirname, '../../uploads', file.stored_name);
  await uploadService.deleteUploadedFile(file);
  await fileModel.remove(req.params.id, req.user);
  res.status(204).send();
});
