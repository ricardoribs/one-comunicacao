const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/fileController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const createScopedQuery = require('../utils/scopedQuery');
const validate = require('../middlewares/validateMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const { verifyFileAccessToken } = require('../utils/fileAccess');
const { fileQuerySchema, fileIdParamSchema, fileUploadSchema } = require('../validators/fileValidators');

const router = express.Router();
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de uploads excedido. Tente novamente mais tarde.' },
});

const authenticateFileContent = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }

  const payload = verifyFileAccessToken(String(req.query.download_token || ''));
  if (!payload || Number(payload.fileId) !== Number(req.params.id)) {
    throw new AppError('Token de acesso ao arquivo invalido ou expirado.', 401);
  }

  const user = await userModel.findById(payload.userId);
  if (!user || !user.is_active) {
    throw new AppError('Usuario invalido ou inativo.', 401);
  }

  req.user = user;
  req.tenant = {
    clientId: user.client_id || null,
    role: user.role,
  };
  req.db = createScopedQuery(user);
  next();
});

router.get(
  '/:id/content',
  validate(fileIdParamSchema, 'params'),
  authenticateFileContent,
  authorizeCapability('view_files'),
  controller.streamContent
);

router.use(authenticate);
router.get('/', authorizeCapability('view_files'), validate(fileQuerySchema, 'query'), controller.list);
router.get('/:id/access-url', authorizeCapability('view_files'), validate(fileIdParamSchema, 'params'), controller.getAccessUrl);
router.post(
  '/',
  uploadLimiter,
  authorizeCapability('manage_files'),
  upload.single('file'),
  validate(fileUploadSchema),
  controller.upload
);
router.delete('/:id', authorizeCapability('manage_files'), validate(fileIdParamSchema, 'params'), controller.remove);

module.exports = router;
