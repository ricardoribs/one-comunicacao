const { z } = require('zod');
const { validateStrongPassword } = require('../utils/passwordPolicy');

const strongPassword = z
  .string()
  .superRefine((value, ctx) => {
    for (const message of validateStrongPassword(value)) {
      ctx.addIssue({
        code: 'custom',
        message,
      });
    }
  });

exports.loginSchema = z
  .object({
    email: z.string().trim(),
    password: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!String(data.email || '').trim() || !String(data.password || '').trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Digite um e-mail e uma senha.',
      });
    }
  });

exports.registerSchema = z.object({
  client_id: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().min(2, 'Nome obrigatório.'),
  email: z.string().email('Informe um e-mail válido.'),
  password: strongPassword,
  role: z.enum(['admin', 'designer', 'gestor', 'comercial', 'dev']).default('designer'),
});

exports.forgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
});

exports.resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: strongPassword,
});

exports.verifyEmailSchema = z.object({
  token: z.string().min(20),
});

exports.mfaChallengeSchema = z.object({
  challenge_token: z.string().min(20),
});

exports.mfaVerifySchema = z.object({
  challenge_token: z.string().min(20),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Informe um codigo TOTP valido com 6 digitos.'),
});

exports.authEmptyBodySchema = z.object({}).strict();
