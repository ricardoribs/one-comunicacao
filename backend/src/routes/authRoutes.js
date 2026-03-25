const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { emptyBodySchema, emptyQuerySchema } = require('../validators/commonValidators');
const {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  authEmptyBodySchema,
} = require('../validators/authValidators');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body?.email || req.ip || '').toLowerCase(),
  message: { message: 'Muitas solicitações de redefinição. Tente novamente mais tarde.' },
});

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post(
  '/register',
  registerLimiter,
  authenticate,
  authorize('admin'),
  validate(registerSchema),
  controller.register
);
router.post('/refresh', validate(authEmptyBodySchema), controller.refresh);
router.post('/logout', validate(emptyBodySchema), controller.logout);
router.post('/logout-all', authenticate, validate(emptyBodySchema), controller.logoutAll);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);
router.get('/verify-email', validate(verifyEmailSchema, 'query'), controller.verifyEmail);
router.get('/me', authenticate, validate(emptyQuerySchema, 'query'), controller.me);

module.exports = router;
