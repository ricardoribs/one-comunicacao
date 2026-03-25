const { z } = require('zod');

const roleEnum = z.enum(['client', 'admin', 'designer', 'gestor', 'comercial', 'dev']);
const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const strongPassword = z
  .string()
  .min(12)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

exports.userSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: strongPassword,
  role: roleEnum,
  is_active: z.boolean().optional(),
});

exports.userUpdateSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: strongPassword.optional(),
  role: roleEnum.optional(),
  is_active: z.boolean().optional(),
});
