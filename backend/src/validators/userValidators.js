const { z } = require('zod');

const roleEnum = z.enum(['client', 'admin', 'designer', 'gestor', 'comercial', 'dev']);
const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const strongPassword = z
  .string()
  .min(12, 'A senha deve ter, no mínimo, 12 caracteres.')
  .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula.')
  .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula.')
  .regex(/[0-9]/, 'A senha deve conter ao menos um número.')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um símbolo.');

exports.userSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  name: z.string().min(2, 'Nome obrigatório.'),
  email: z.string().email('Informe um e-mail válido.'),
  password: strongPassword,
  role: roleEnum,
  is_active: z.boolean().optional(),
});

exports.userUpdateSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  name: z.string().min(2, 'Nome obrigatório.').optional(),
  email: z.string().email('Informe um e-mail válido.').optional(),
  password: strongPassword.optional(),
  role: roleEnum.optional(),
  is_active: z.boolean().optional(),
});
