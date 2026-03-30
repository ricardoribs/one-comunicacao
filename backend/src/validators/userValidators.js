const { z } = require('zod');

const roleEnum = z.enum(['client', 'admin', 'designer', 'gestor', 'comercial', 'dev']);

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const emptyToNullString = (schema) =>
  z.preprocess((value) => {
    if (value === '' || value === undefined || value === null) {
      return null;
    }

    return String(value).trim();
  }, schema.nullable());

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
  phone: emptyToNullString(z.string().max(40, 'Telefone muito longo.')).optional(),
  job_title: emptyToNullString(z.string().max(120, 'Cargo muito longo.')).optional(),
  avatar_url: emptyToNullString(z.string().url('Informe uma URL válida para a foto.').max(500)).optional(),
});

exports.userUpdateSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  name: z.string().min(2, 'Nome obrigatório.').optional(),
  email: z.string().email('Informe um e-mail válido.').optional(),
  password: strongPassword.optional(),
  role: roleEnum.optional(),
  is_active: z.boolean().optional(),
  phone: emptyToNullString(z.string().max(40, 'Telefone muito longo.')).optional(),
  job_title: emptyToNullString(z.string().max(120, 'Cargo muito longo.')).optional(),
  avatar_url: emptyToNullString(z.string().url('Informe uma URL válida para a foto.').max(500)).optional(),
});

exports.profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório.').max(120, 'Nome muito longo.').optional(),
  email: z.string().trim().email('Informe um e-mail válido.').optional(),
  phone: emptyToNullString(z.string().max(40, 'Telefone muito longo.')).optional(),
  job_title: emptyToNullString(z.string().max(120, 'Cargo muito longo.')).optional(),
  avatar_url: emptyToNullString(z.string().url('Informe uma URL válida para a foto.').max(500)).optional(),
});

exports.notificationPreferencesSchema = z.object({
  task_assigned: z.boolean().optional(),
  task_completed: z.boolean().optional(),
  calendar_24h: z.boolean().optional(),
  calendar_1h: z.boolean().optional(),
});

exports.passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual.'),
  new_password: strongPassword,
});
