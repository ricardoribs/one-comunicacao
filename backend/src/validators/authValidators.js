const { z } = require('zod');

const strongPassword = z
  .string()
  .min(12, 'Senha deve ter no minimo 12 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiuscula')
  .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minuscula')
  .regex(/[0-9]/, 'Senha deve conter ao menos um numero')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter ao menos um simbolo');

exports.loginSchema = z.object({
  email: z.string().email('Informe um e-mail valido'),
  password: z.string().min(1, 'Senha obrigatoria'),
});

exports.registerSchema = z.object({
  client_id: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().min(2, 'Nome obrigatorio'),
  email: z.string().email('Informe um e-mail valido'),
  password: strongPassword,
  role: z.enum(['client', 'admin', 'designer', 'gestor', 'comercial', 'dev']).default('client'),
});

exports.forgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail valido'),
});

exports.resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: strongPassword,
});

exports.verifyEmailSchema = z.object({
  token: z.string().min(20),
});

exports.authEmptyBodySchema = z.object({}).strict();
