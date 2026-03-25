const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/fileController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const { fileQuerySchema, fileIdParamSchema, fileUploadSchema } = require('../validators/fileValidators');

const router = express.Router();
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de uploads excedido. Tente novamente mais tarde.' },
});

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
