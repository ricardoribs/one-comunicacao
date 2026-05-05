const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const fileModel = require('../models/fileModel');
const { ensureClientAccess } = require('../utils/access');
const uploadService = require('../services/uploadService');
const { decorateFileCollection, decorateFileRecord } = require('../utils/fileAccess');
const { sendPaginated } = require('../utils/response');

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
    return res.status(404).json({ message: 'Arquivo não encontrado.' });
  }

  res.json({
    url: await uploadService.resolveFileAccessUrl(file),
  });
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
