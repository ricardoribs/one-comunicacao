const { z } = require('zod');

const strongPassword = z
  .string()
  .min(12, 'A senha deve ter, no mínimo, 12 caracteres.')
  .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula.')
  .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula.')
  .regex(/[0-9]/, 'A senha deve conter ao menos um número.')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um símbolo.');

exports.loginSchema = z
  .object({
    email: z.string().trim(),
    password: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!String(data.email || '').trim() || !String(data.password || '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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
  role: z.enum(['client', 'admin', 'designer', 'gestor', 'comercial', 'dev']).default('client'),
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
