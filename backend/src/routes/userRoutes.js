const rateLimit = require('express-rate-limit');
const express = require('express');
const controller = require('../controllers/userController');
const { authenticate, authorize, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const {
  userSchema,
  userUpdateSchema,
  profileUpdateSchema,
  notificationPreferencesSchema,
  passwordChangeSchema,
  mfaTotpEnrollSchema,
} = require('../validators/userValidators');
const { paginationQuerySchema, idParamSchema, emptyBodySchema, emptyQuerySchema } = require('../validators/commonValidators');

const router = express.Router();
const profileMfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id || req.ip || ''),
  message: { message: 'Muitas tentativas de MFA. Tente novamente em alguns minutos.' },
});

router.use(authenticate);
router.get('/me/profile', validate(emptyQuerySchema, 'query'), controller.getMyProfile);
router.patch('/me/profile', validate(profileUpdateSchema), controller.updateMyProfile);
router.patch('/me/notification-preferences', validate(notificationPreferencesSchema), controller.updateMyNotificationPreferences);
router.post('/me/avatar', upload.single('file'), controller.uploadMyAvatar);
router.delete('/me/avatar', controller.removeMyAvatar);
router.patch('/me/password', validate(passwordChangeSchema), controller.updateMyPassword);
router.post('/me/mfa/totp/setup', profileMfaLimiter, validate(emptyBodySchema), controller.setupMyTotpEnrollment);
router.post('/me/mfa/totp/enroll', profileMfaLimiter, validate(mfaTotpEnrollSchema), controller.completeMyTotpEnrollment);
router.get('/team', authorizeCapability('view_dashboard_team'), validate(emptyQuerySchema, 'query'), controller.listInternalTeam);
router.get(
  '/assignable',
  authorizeCapability('view_internal_directory'),
  validate(emptyQuerySchema, 'query'),
  controller.listAssignableInternal
);
router.use(authorize('admin'));
router.get('/access-overview', validate(paginationQuerySchema, 'query'), controller.listAccessOverview);
router.get('/', validate(paginationQuerySchema, 'query'), controller.list);
router.get('/:id/security', validate(idParamSchema, 'params'), controller.getSecurityInfo);
router.post('/', validate(userSchema), controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), validate(userUpdateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), validate(userUpdateSchema), controller.update);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
