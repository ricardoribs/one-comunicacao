const { z } = require('zod');

const roleEnum = z.enum(['client', 'admin', 'designer', 'gestor', 'comercial', 'dev']);
const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const strongPassword = z
  .string()
  .min(12, 'Senha deve ter no minimo 12 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiuscula')
  .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minuscula')
  .regex(/[0-9]/, 'Senha deve conter ao menos um numero')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter ao menos um simbolo');

exports.userSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  name: z.string().min(2, 'Nome obrigatorio'),
  email: z.string().email('Informe um e-mail valido'),
  password: strongPassword,
  role: roleEnum,
  is_active: z.boolean().optional(),
});

exports.userUpdateSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  name: z.string().min(2, 'Nome obrigatorio').optional(),
  email: z.string().email('Informe um e-mail valido').optional(),
  password: strongPassword.optional(),
  role: roleEnum.optional(),
  is_active: z.boolean().optional(),
});
